import { describe, it, expect } from 'vitest'
import { generateToken, expiryFromNow } from './tokens'

describe('tokens', () => {
  it('generates a url-safe random token', () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/)
    expect(generateToken()).not.toBe(t)
  })
  it('computes a future expiry', () => {
    const exp = expiryFromNow(60)
    expect(exp.getTime()).toBeGreaterThan(Date.now())
  })
})
