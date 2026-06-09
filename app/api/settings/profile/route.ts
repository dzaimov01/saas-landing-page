import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'

const Body = z.object({ name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } })
  return NextResponse.json({ ok: true })
}
