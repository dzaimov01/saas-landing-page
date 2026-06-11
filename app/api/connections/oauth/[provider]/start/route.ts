import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { oauthEnabled, buildAuthorizeUrl, type OAuthProviderId } from '@/lib/connections/oauth'
import { newStateToken } from '@/lib/connections/oauth-state'

export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!oauthEnabled(provider)) {
    return NextResponse.json({ error: 'This integration is not configured.' }, { status: 404 })
  }
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const { token, state } = newStateToken(provider, active.workspace.id)
  const url = buildAuthorizeUrl(provider as OAuthProviderId, state)
  const res = NextResponse.redirect(url)
  res.cookies.set('oauth_state', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
