import { db } from './db'
import { summarizeRuns, type RunsSummary } from './analytics'
import { getWorkspacePlan, runsThisMonth } from './billing'

export interface AnalyticsData {
  summary: RunsSummary
  quota: { used: number; limit: number | null }
}

/** Load the last 30 days of runs for a workspace and aggregate dashboard metrics. */
export async function loadWorkspaceAnalytics(workspaceId: string): Promise<AnalyticsData> {
  const since = new Date(Date.now() - 30 * 86_400_000)
  const runs = await db.workflowRun.findMany({
    where: { workspaceId, createdAt: { gte: since } },
    select: {
      status: true,
      createdAt: true,
      workflowId: true,
      workflow: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })

  const summary = summarizeRuns(
    runs.map((r) => ({
      status: r.status,
      createdAt: r.createdAt,
      workflowId: r.workflowId,
      workflowName: r.workflow?.name ?? 'Untitled',
    })),
    { days: 30 },
  )

  const plan = await getWorkspacePlan(workspaceId)
  const used = await runsThisMonth(workspaceId)
  const limit = Number.isFinite(plan.maxRunsPerMonth) ? plan.maxRunsPerMonth : null

  return { summary, quota: { used, limit } }
}
