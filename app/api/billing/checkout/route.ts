import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { billingEnabled, getStripe, createCheckoutSession } from '@/lib/stripe'
import { getPlan } from '@/lib/plans'
import { rateLimit } from '@/lib/ratelimit'

const Body = z.object({
  plan: z.enum(['TEAM', 'SCALE']),
  interval: z.enum(['monthly', 'annual']),
})

export async function POST(req: Request) {
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

  const rl = await rateLimit(`checkout:${user.id}`, { limit: 10, windowSec: 60 })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } },
    )
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const priceId = getPlan(parsed.data.plan).priceIds[parsed.data.interval]
  if (!priceId) return NextResponse.json({ error: 'Price not configured for that plan.' }, { status: 400 })

  // Ensure a Stripe customer exists for the workspace.
  const sub = await db.subscription.findUnique({ where: { workspaceId: active.workspace.id } })
  let customerId = sub?.stripeCustomerId ?? undefined
  if (!customerId) {
    const customer = await getStripe().customers.create({
      name: active.workspace.name,
      email: user.email ?? undefined,
      metadata: { workspaceId: active.workspace.id },
    })
    customerId = customer.id
    await db.subscription.upsert({
      where: { workspaceId: active.workspace.id },
      create: { workspaceId: active.workspace.id, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    })
  }

  const session = await createCheckoutSession({
    priceId,
    workspaceId: active.workspace.id,
    customerId,
    successUrl: `${env.APP_URL}/app/settings/billing?success=1`,
    cancelUrl: `${env.APP_URL}/app/settings/billing`,
  })
  return NextResponse.json({ url: session.url })
}
