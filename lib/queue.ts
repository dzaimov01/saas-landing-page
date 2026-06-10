import { Queue, type ConnectionOptions } from 'bullmq'
import { env } from './env'

export type RunJob = { type: 'run'; runId: string } | { type: 'schedule'; workflowId: string }

/** Build BullMQ connection options from REDIS_URL (supports redis:// and rediss://). */
export function connectionOptions(): ConnectionOptions {
  if (!env.REDIS_URL) throw new Error('REDIS_URL is not set — the execution engine requires Redis.')
  const u = new URL(env.REDIS_URL)
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    maxRetriesPerRequest: null,
    ...(u.protocol === 'rediss:' ? { tls: {} } : {}),
  }
}

let runsQueue: Queue<RunJob> | undefined

export function getRunsQueue(): Queue<RunJob> {
  if (!runsQueue) runsQueue = new Queue<RunJob>('runs', { connection: connectionOptions() })
  return runsQueue
}

export async function enqueueRun(runId: string): Promise<void> {
  await getRunsQueue().add(
    'run',
    { type: 'run', runId },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: true, removeOnFail: 100 },
  )
}

export interface ScheduleConfig {
  mode: 'interval' | 'cron'
  value: string
}

export async function upsertSchedule(workflowId: string, config: ScheduleConfig): Promise<void> {
  const repeat =
    config.mode === 'cron'
      ? { pattern: config.value }
      : { every: Math.max(1, Number(config.value) || 1) * 60_000 }
  await getRunsQueue().upsertJobScheduler(`schedule:${workflowId}`, repeat, {
    name: 'schedule',
    data: { type: 'schedule', workflowId },
  })
}

export async function removeSchedule(workflowId: string): Promise<void> {
  await getRunsQueue()
    .removeJobScheduler(`schedule:${workflowId}`)
    .catch(() => {})
}
