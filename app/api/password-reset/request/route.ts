import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'
import { rateLimit, clientIp } from '@/lib/ratelimit'

const Body = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  const rl = await rateLimit(`pwreset:${clientIp(req)}`, { limit: 5, windowSec: 600 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const email = parsed.data.email.toLowerCase()
  const user = await db.user.findUnique({ where: { email } })
  // Always respond 200 to avoid leaking which emails exist.
  if (user) {
    const token = generateToken()
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: expiryFromNow(60) },
    })
    const url = `${env.APP_URL}/reset-password?token=${token}`
    await sendEmail({
      to: email,
      subject: 'Reset your Cadence password',
      html: actionLinkEmail('Reset your password', url, 'Choose a new password'),
    })
  }
  return NextResponse.json({ ok: true })
}
