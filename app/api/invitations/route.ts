import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'

const Body = z.object({
  workspaceId: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']),
})

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const { workspaceId, email, role } = parsed.data
  try {
    await requireWorkspaceRole(user.id, workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const token = generateToken()
  await db.invitation.create({
    data: {
      workspaceId,
      email: email.toLowerCase(),
      role,
      token,
      expiresAt: expiryFromNow(60 * 24 * 7),
      invitedById: user.id,
    },
  })
  const url = `${env.APP_URL}/api/invitations/accept?token=${token}`
  await sendEmail({
    to: email,
    subject: 'You have been invited to a Cadence workspace',
    html: actionLinkEmail('Join the workspace', url, 'Accept invitation'),
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}
