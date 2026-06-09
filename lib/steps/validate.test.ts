import { describe, it, expect } from 'vitest'
import { validateWorkflow } from './validate'

const trig = { id: 't', type: 'schedule', config: { mode: 'interval', value: '15' } }
const action = { id: 'a', type: 'http_request', config: { method: 'GET', url: 'https://x.com' } }

describe('validateWorkflow', () => {
  it('passes a trigger→action graph', () => {
    expect(
      validateWorkflow([trig, action], [{ sourceId: 't', targetId: 'a', sourceHandle: null }]).errors,
    ).toEqual([])
  })
  it('flags missing trigger', () => {
    expect(validateWorkflow([action], []).errors.join(' ')).toMatch(/trigger/i)
  })
  it('flags two triggers', () => {
    expect(
      validateWorkflow([trig, { ...trig, id: 't2' }], []).errors.join(' '),
    ).toMatch(/only one trigger/i)
  })
  it('flags invalid config', () => {
    expect(validateWorkflow([{ ...trig, config: {} }], []).errors.join(' ')).toMatch(/config/i)
  })
  it('flags condition missing a branch', () => {
    const cond = { id: 'c', type: 'condition', config: { field: 'x', operator: 'eq', value: '1' } }
    const errs = validateWorkflow(
      [trig, cond, action],
      [
        { sourceId: 't', targetId: 'c', sourceHandle: null },
        { sourceId: 'c', targetId: 'a', sourceHandle: 'true' },
      ],
    ).errors
    expect(errs.join(' ')).toMatch(/false/i)
  })
  it('flags orphan node', () => {
    expect(validateWorkflow([trig, action], []).errors.join(' ')).toMatch(/not reachable/i)
  })
})
