import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: {
    subscription: { findUnique: vi.fn() },
    workflow: { count: vi.fn() },
    workflowRun: { count: vi.fn() },
  },
}))
vi.mock('./db', () => ({ db }))

import { getWorkspacePlan, assertCanCreateWorkflow, PlanLimitError } from './billing'

beforeEach(() => {
  db.subscription.findUnique.mockReset()
  db.workflow.count.mockReset()
  db.workflowRun.count.mockReset()
})

describe('getWorkspacePlan', () => {
  it('returns the active subscription plan', async () => {
    db.subscription.findUnique.mockResolvedValue({ plan: 'TEAM', status: 'active' })
    expect((await getWorkspacePlan('w')).key).toBe('TEAM')
  })
  it('falls back to STARTER when no subscription', async () => {
    db.subscription.findUnique.mockResolvedValue(null)
    expect((await getWorkspacePlan('w')).key).toBe('STARTER')
  })
  it('treats canceled subscriptions as STARTER', async () => {
    db.subscription.findUnique.mockResolvedValue({ plan: 'TEAM', status: 'canceled' })
    expect((await getWorkspacePlan('w')).key).toBe('STARTER')
  })
})

describe('assertCanCreateWorkflow', () => {
  it('throws workflow_limit at the Starter cap', async () => {
    db.subscription.findUnique.mockResolvedValue(null)
    db.workflow.count.mockResolvedValue(3)
    await expect(assertCanCreateWorkflow('w')).rejects.toBeInstanceOf(PlanLimitError)
  })
  it('allows creation below the cap', async () => {
    db.subscription.findUnique.mockResolvedValue(null)
    db.workflow.count.mockResolvedValue(2)
    await expect(assertCanCreateWorkflow('w')).resolves.toBeUndefined()
  })
})
