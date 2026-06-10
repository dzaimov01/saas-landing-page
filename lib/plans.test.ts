import { describe, it, expect } from 'vitest'
import { getPlan, checkWorkflowLimit, checkRunQuota, planForPriceId, PLANS } from './plans'

describe('plan limits', () => {
  it('starter caps workflows at 3', () => {
    expect(checkWorkflowLimit(getPlan('STARTER'), 2)).toBe(true)
    expect(checkWorkflowLimit(getPlan('STARTER'), 3)).toBe(false)
  })
  it('team allows many workflows', () => {
    expect(checkWorkflowLimit(getPlan('TEAM'), 999)).toBe(true)
  })
  it('starter run quota is 500', () => {
    expect(checkRunQuota(getPlan('STARTER'), 499)).toBe(true)
    expect(checkRunQuota(getPlan('STARTER'), 500)).toBe(false)
  })
  it('scale run quota is 250k', () => {
    expect(checkRunQuota(getPlan('SCALE'), 249_999)).toBe(true)
    expect(checkRunQuota(getPlan('SCALE'), 250_000)).toBe(false)
  })
})

describe('planForPriceId', () => {
  it('maps a known price id to its plan', () => {
    PLANS.TEAM.priceIds.monthly = 'price_team_m'
    expect(planForPriceId('price_team_m')).toBe('TEAM')
    expect(planForPriceId('price_unknown')).toBeNull()
  })
})
