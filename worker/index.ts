import { Worker } from 'bullmq'
import { env } from '../lib/env'
import { connectionOptions, type RunJob } from '../lib/queue'
import { executeRun } from '../lib/engine/execute'
import { db } from '../lib/db'

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

worker.on('completed', (job) => console.log('[worker] completed', job.id))
worker.on('failed', (job, err) => console.error('[worker] failed', job?.id, err?.message))

console.log('[worker] listening on "runs" queue')

async function shutdown() {
  await worker.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
