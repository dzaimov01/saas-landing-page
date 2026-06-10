import { describe, it, expect } from 'vitest'
import { evaluate } from './condition'

const ctx = { trigger: { amount: 10, name: 'Ada' }, steps: {} }

describe('condition evaluate', () => {
  it('eq', () => {
    expect(evaluate({ field: 'trigger.name', operator: 'eq', value: 'Ada' }, ctx)).toBe(true)
  })
  it('gt', () => {
    expect(evaluate({ field: 'trigger.amount', operator: 'gt', value: '5' }, ctx)).toBe(true)
  })
  it('lt false', () => {
    expect(evaluate({ field: 'trigger.amount', operator: 'lt', value: '5' }, ctx)).toBe(false)
  })
  it('contains', () => {
    expect(evaluate({ field: 'trigger.name', operator: 'contains', value: 'd' }, ctx)).toBe(true)
  })
  it('neq false', () => {
    expect(evaluate({ field: 'trigger.name', operator: 'neq', value: 'Ada' }, ctx)).toBe(false)
  })
})
