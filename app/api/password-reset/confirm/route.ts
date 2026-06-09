import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

const Body = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { token, password } = parsed.data
  const row = await db.passwordResetToken.findUnique({ where: { token } })
  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
  }
  await db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } })
  await db.passwordResetToken.delete({ where: { token } })
  return NextResponse.json({ ok: true })
}
