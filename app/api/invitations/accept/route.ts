import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const session = await auth()
  if (!session?.user?.id) {
    const login = new URL('/login', req.url)
    login.searchParams.set('callbackUrl', `/api/invitations/accept?token=${token}`)
    return NextResponse.redirect(login)
  }

  const invite = await db.invitation.findUnique({ where: { token } })
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/app?invite=invalid', req.url))
  }
  await db.membership.upsert({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: invite.workspaceId } },
    update: { role: invite.role },
    create: { userId: session.user.id, workspaceId: invite.workspaceId, role: invite.role },
  })
  await db.invitation.update({ where: { token }, data: { acceptedAt: new Date() } })
  const res = NextResponse.redirect(new URL('/app', req.url))
  res.cookies.set('ws', invite.workspaceId, { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
