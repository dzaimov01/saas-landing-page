import IORedis from 'ioredis'
import { env } from './env'

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfter: number
}

interface RedisLike {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
}

let client: RedisLike | null | undefined

function getClient(): RedisLike | null {
  if (client === undefined) {
    client = env.REDIS_URL ? (new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null }) as RedisLike) : null
  }
  return client
}

/** Test seam: inject a mock client (or null to simulate "no Redis"). */
export function __setClientForTests(c: RedisLike | null): void {
  client = c
}

/** Fixed-window rate limit. No-op (always ok) when Redis is not configured. */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const redis = getClient()
  if (!redis) return { ok: true, remaining: opts.limit, retryAfter: 0 }

  const k = `rl:${key}`
  const count = await redis.incr(k)
  if (count === 1) await redis.expire(k, opts.windowSec)

  if (count > opts.limit) {
    const ttl = await redis.ttl(k)
    return { ok: false, remaining: 0, retryAfter: ttl > 0 ? ttl : opts.windowSec }
  }
  return { ok: true, remaining: Math.max(0, opts.limit - count), retryAfter: 0 }
}

export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}
