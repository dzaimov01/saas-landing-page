import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'

const Body = z.object({ email: z.string().email() })

export async function POST(req: Request) {
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
