import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createPersonalWorkspace } from '@/lib/workspace'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'
import { rateLimit, clientIp } from '@/lib/ratelimit'

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { error: 'Too many attempts. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  )
}

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  const rl = await rateLimit(`signup:${clientIp(req)}`, { limit: 5, windowSec: 600 })
  if (!rl.ok) return tooMany(rl.retryAfter)

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { name, email: rawEmail, password } = parsed.data
  const email = rawEmail.toLowerCase()

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  })
  await createPersonalWorkspace({ userId: user.id, name })

  // Soft email verification: send a verify link but do not block login.
  const token = generateToken()
  await db.verificationToken.create({
    data: { identifier: email, token, expires: expiryFromNow(60 * 24) },
  })
  const url = `${env.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  await sendEmail({
    to: email,
    subject: 'Verify your Cadence email',
    html: actionLinkEmail('Confirm your email', url, 'Verify email'),
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
