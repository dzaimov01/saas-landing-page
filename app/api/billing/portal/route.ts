import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { billingEnabled, createPortalSession } from '@/lib/stripe'

export async function POST() {
  if (!billingEnabled()) return NextResponse.json({ error: 'Billing is not configured.' }, { status: 400 })

  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }

  const sub = await db.subscription.findUnique({ where: { workspaceId: active.workspace.id } })
  if (!sub?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account yet.' }, { status: 400 })
  }
  const session = await createPortalSession({
    customerId: sub.stripeCustomerId,
    returnUrl: `${env.APP_URL}/app/settings/billing`,
  })
  return NextResponse.json({ url: session.url })
}
