export interface RunRow {
  status: string
  createdAt: Date
  workflowId: string
  workflowName: string
}

export interface DayBucket {
  date: string // YYYY-MM-DD (UTC)
  succeeded: number
  failed: number
}

export interface RunsSummary {
  total: number
  succeeded: number
  failed: number
  active: number
  successRate: number
  perDay: DayBucket[]
  topWorkflows: { name: string; count: number }[]
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Aggregate workflow runs into dashboard metrics: status counts, success rate,
 * a zero-filled per-day series (oldest → newest, UTC), and the top workflows.
 */
export function summarizeRuns(
  runs: RunRow[],
  { now = new Date(), days = 30 }: { now?: Date; days?: number } = {},
): RunsSummary {
  let succeeded = 0
  let failed = 0
  let active = 0
  const byDay = new Map<string, DayBucket>()
  const byWorkflow = new Map<string, number>()

  // Seed zero-filled day buckets, oldest → newest.
  const buckets: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = dayKey(d)
    const bucket = { date: key, succeeded: 0, failed: 0 }
    byDay.set(key, bucket)
    buckets.push(bucket)
  }

  for (const r of runs) {
    if (r.status === 'SUCCEEDED') succeeded++
    else if (r.status === 'FAILED') failed++
    else active++

    const bucket = byDay.get(dayKey(r.createdAt))
    if (bucket) {
      if (r.status === 'SUCCEEDED') bucket.succeeded++
      else if (r.status === 'FAILED') bucket.failed++
    }
    byWorkflow.set(r.workflowName, (byWorkflow.get(r.workflowName) ?? 0) + 1)
  }

  const finished = succeeded + failed
  const successRate = finished === 0 ? 0 : Math.round((succeeded / finished) * 100)
  const topWorkflows = [...byWorkflow.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    total: runs.length,
    succeeded,
    failed,
    active,
    successRate,
    perDay: buckets,
    topWorkflows,
  }
}
