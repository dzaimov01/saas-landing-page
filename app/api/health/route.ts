import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

export const dynamic = 'force-dynamic'

export async function GET() {
  let dbOk = false
  try {
    await db.$queryRaw`SELECT 1`
    dbOk = true
  } catch {
    dbOk = false
  }

  let redis: 'ok' | 'unconfigured' | 'error' = 'unconfigured'
  if (env.REDIS_URL) {
    try {
      const { getRunsQueue } = await import('@/lib/queue')
      const client = (await getRunsQueue().client) as unknown as { ping: () => Promise<unknown> }
      await client.ping()
      redis = 'ok'
    } catch {
      redis = 'error'
    }
  }

  const status = dbOk ? 'ok' : 'degraded'
  return NextResponse.json(
    { status, db: dbOk ? 'ok' : 'error', redis },
    { status: dbOk ? 200 : 503 },
  )
}
