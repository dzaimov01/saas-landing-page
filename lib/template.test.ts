import { describe, it, expect } from 'vitest'
import { interpolate, resolveConfig, resolvePath } from './template'

const ctx = { trigger: { body: { email: 'a@b.com' } }, steps: { n1: { status: 200 } } }

describe('templating', () => {
  it('resolves a dot path', () => {
    expect(resolvePath('trigger.body.email', ctx)).toBe('a@b.com')
    expect(resolvePath('steps.n1.status', ctx)).toBe(200)
  })
  it('replaces a dot path in a string', () => {
    expect(interpolate('to {{trigger.body.email}}', ctx)).toBe('to a@b.com')
  })
  it('blanks unknown paths', () => {
    expect(interpolate('x{{nope.q}}y', ctx)).toBe('xy')
  })
  it('passes non-strings through', () => {
    expect(interpolate(5, ctx)).toBe(5)
  })
  it('resolves config object fields', () => {
    expect(resolveConfig({ url: '{{steps.n1.status}}', n: 3 }, ctx)).toEqual({ url: '200', n: 3 })
  })
})
