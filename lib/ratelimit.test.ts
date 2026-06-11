import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rateLimit, clientIp, __setClientForTests } from './ratelimit'

// These tests assert the core limiting logic, so they must not be affected by an
// ambient DISABLE_RATE_LIMIT=1 (which CI sets job-wide for the e2e server). Control
// the flag explicitly and restore it afterwards.
const savedDisable = process.env.DISABLE_RATE_LIMIT
beforeEach(() => {
  delete process.env.DISABLE_RATE_LIMIT
})
afterEach(() => {
  __setClientForTests(null)
  if (savedDisable === undefined) delete process.env.DISABLE_RATE_LIMIT
  else process.env.DISABLE_RATE_LIMIT = savedDisable
})

function mockRedis(count: number, ttl = 30) {
  return {
    incr: vi.fn().mockResolvedValue(count),
    expire: vi.fn().mockResolvedValue(1),
    ttl: vi.fn().mockResolvedValue(ttl),
  }
}

describe('rateLimit', () => {
  it('allows under the limit and sets expiry on first hit', async () => {
    const redis = mockRedis(1)
    __setClientForTests(redis)
    const res = await rateLimit('k', { limit: 5, windowSec: 60 })
    expect(res.ok).toBe(true)
    expect(res.remaining).toBe(4)
    expect(redis.expire).toHaveBeenCalledWith('rl:k', 60)
  })

  it('blocks over the limit with retryAfter from ttl', async () => {
    __setClientForTests(mockRedis(6, 42))
    const res = await rateLimit('k', { limit: 5, windowSec: 60 })
    expect(res.ok).toBe(false)
    expect(res.retryAfter).toBe(42)
  })

  it('is a no-op when Redis is not configured', async () => {
    __setClientForTests(null)
    const res = await rateLimit('k', { limit: 1, windowSec: 60 })
    expect(res.ok).toBe(true)
  })

  it('is bypassed entirely when DISABLE_RATE_LIMIT=1', async () => {
    process.env.DISABLE_RATE_LIMIT = '1'
    const redis = mockRedis(6, 42) // would otherwise block
    __setClientForTests(redis)
    const res = await rateLimit('k', { limit: 5, windowSec: 60 })
    expect(res.ok).toBe(true)
    expect(redis.incr).not.toHaveBeenCalled()
  })
})

describe('clientIp', () => {
  it('reads the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } })
    expect(clientIp(req)).toBe('1.2.3.4')
  })
})
