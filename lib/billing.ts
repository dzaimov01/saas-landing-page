import { db } from './db'
import { getPlan, checkWorkflowLimit, checkRunQuota, type Plan } from './plans'

export class PlanLimitError extends Error {
  code: 'workflow_limit' | 'run_quota'
  constructor(code: 'workflow_limit' | 'run_quota', message: string) {
    super(message)
    this.name = 'PlanLimitError'
    this.code = code
  }
}

export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  const sub = await db.subscription.findUnique({ where: { workspaceId } })
  if (sub && (sub.status === 'active' || sub.status === 'trialing')) return getPlan(sub.plan)
  return getPlan('STARTER')
}

export function startOfMonth(now = new Date()): Date {
  const d = new Date(now)
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d
}

export async function runsThisMonth(workspaceId: string): Promise<number> {
  return db.workflowRun.count({
    where: { workspaceId, createdAt: { gte: startOfMonth() } },
  })
}

export async function assertCanCreateWorkflow(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  const count = await db.workflow.count({ where: { workspaceId } })
  if (!checkWorkflowLimit(plan, count)) {
    throw new PlanLimitError(
      'workflow_limit',
      `Your ${plan.name} plan allows ${plan.maxWorkflows} workflows. Upgrade to add more.`,
    )
  }
}

export async function assertWithinRunQuota(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId)
  const used = await runsThisMonth(workspaceId)
  if (!checkRunQuota(plan, used)) {
    throw new PlanLimitError(
      'run_quota',
      `Your ${plan.name} plan allows ${plan.maxRunsPerMonth} runs per month. Upgrade for more.`,
    )
  }
}
