export type PlanKey = 'STARTER' | 'TEAM' | 'SCALE'

export interface Plan {
  key: PlanKey
  name: string
  maxWorkflows: number
  maxRunsPerMonth: number
  priceIds: { monthly?: string; annual?: string }
}

export const PLANS: Record<PlanKey, Plan> = {
  STARTER: {
    key: 'STARTER',
    name: 'Starter',
    maxWorkflows: 3,
    maxRunsPerMonth: 500,
    priceIds: {},
  },
  TEAM: {
    key: 'TEAM',
    name: 'Team',
    maxWorkflows: Infinity,
    maxRunsPerMonth: 25_000,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_TEAM_MONTHLY,
      annual: process.env.STRIPE_PRICE_TEAM_ANNUAL,
    },
  },
  SCALE: {
    key: 'SCALE',
    name: 'Scale',
    maxWorkflows: Infinity,
    maxRunsPerMonth: 250_000,
    priceIds: {
      monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY,
      annual: process.env.STRIPE_PRICE_SCALE_ANNUAL,
    },
  },
}

export function getPlan(key: PlanKey): Plan {
  return PLANS[key]
}

export function planForPriceId(priceId: string): PlanKey | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.priceIds.monthly === priceId || plan.priceIds.annual === priceId) return plan.key
  }
  return null
}

export function checkWorkflowLimit(plan: Plan, currentCount: number): boolean {
  return currentCount < plan.maxWorkflows
}

export function checkRunQuota(plan: Plan, runsThisMonth: number): boolean {
  return runsThisMonth < plan.maxRunsPerMonth
}
