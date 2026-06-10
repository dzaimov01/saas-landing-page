import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { db } from '@/lib/db'
import { getWorkspacePlan, runsThisMonth } from '@/lib/billing'
import { billingEnabled } from '@/lib/stripe'
import { BillingClient } from './BillingClient'

export default async function BillingSettings() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')

  const plan = await getWorkspacePlan(active.workspace.id)
  const workflows = await db.workflow.count({ where: { workspaceId: active.workspace.id } })
  const runs = await runsThisMonth(active.workspace.id)
  const sub = await db.subscription.findUnique({ where: { workspaceId: active.workspace.id } })

  return (
    <BillingClient
      enabled={billingEnabled()}
      canManage={active.role !== 'MEMBER'}
      plan={{
        key: plan.key,
        name: plan.name,
        maxWorkflows: Number.isFinite(plan.maxWorkflows) ? plan.maxWorkflows : null,
        maxRunsPerMonth: plan.maxRunsPerMonth,
      }}
      usage={{ workflows, runs }}
      status={sub?.status ?? null}
      hasSubscription={!!sub?.stripeSubscriptionId}
    />
  )
}
