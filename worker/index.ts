import { Worker } from 'bullmq'
import { env } from '../lib/env'
import { connectionOptions, type RunJob } from '../lib/queue'
import { executeRun } from '../lib/engine/execute'
import { db } from '../lib/db'
import { assertWithinRunQuota, PlanLimitError } from '../lib/billing'
import { logger } from '../lib/logger'

if (!env.REDIS_URL) {
  console.error('[worker] REDIS_URL is not set — cannot start.')
  process.exit(1)
}

const worker = new Worker<RunJob>(
  'runs',
  async (job) => {
    const data = job.data
    if (data.type === 'run') {
      await executeRun(data.runId)
      return
    }
    // Scheduled trigger fired — create a run, then execute it.
    const wf = await db.workflow.findUnique({ where: { id: data.workflowId } })
    if (!wf || wf.status !== 'ENABLED') return
    try {
      await assertWithinRunQuota(wf.workspaceId)
    } catch (e) {
      if (e instanceof PlanLimitError) {
        logger.warn('worker: schedule skipped (plan limit)', { workflowId: wf.id, reason: e.message })
        return
      }
      throw e
    }
    const run = await db.workflowRun.create({
      data: {
        workflowId: wf.id,
        workspaceId: wf.workspaceId,
        status: 'QUEUED',
        trigger: { scheduled: true, at: new Date().toISOString() },
      },
    })
    await executeRun(run.id)
  },
  { connection: connectionOptions(), concurrency: 5 },
)

worker.on('completed', (job) => logger.info('worker: job completed', { jobId: job.id }))
worker.on('failed', (job, err) =>
  logger.error('worker: job failed', { jobId: job?.id, error: err?.message }),
)

logger.info('worker: listening on "runs" queue')

async function shutdown() {
  await worker.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
