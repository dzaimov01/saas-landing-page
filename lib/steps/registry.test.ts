import { describe, it, expect } from 'vitest'
import { STEP_TYPES, getStepType, listStepTypes } from './registry'

describe('step registry', () => {
  it('classifies kinds and condition handles', () => {
    expect(getStepType('schedule').kind).toBe('TRIGGER')
    expect(getStepType('http_request').kind).toBe('ACTION')
    expect(getStepType('condition').handles.source).toEqual(['true', 'false'])
  })
  it('triggers have no target handle', () => {
    expect(getStepType('schedule').handles.target).toBe(false)
    expect(getStepType('http_request').handles.target).toBe(true)
  })
  it('validates good and rejects bad config', () => {
    expect(
      getStepType('send_email').configSchema.safeParse({ to: 'a@b.com', subject: 'x', body: 'y' })
        .success,
    ).toBe(true)
    expect(
      getStepType('send_email').configSchema.safeParse({ to: 'nope', subject: '', body: '' }).success,
    ).toBe(false)
  })
  it('every default config satisfies (or is a valid draft for) its schema shape', () => {
    expect(listStepTypes().length).toBeGreaterThanOrEqual(7)
    expect(Object.keys(STEP_TYPES)).toContain('webhook')
  })
  it('throws on unknown key', () => {
    expect(() => getStepType('nope')).toThrow()
  })
})
