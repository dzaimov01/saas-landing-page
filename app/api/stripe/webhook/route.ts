import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { db } from '@/lib/db'
import { getStripe, verifyWebhook } from '@/lib/stripe'
import { planForPriceId } from '@/lib/plans'

export const runtime = 'nodejs'

/** Read the current period end across Stripe API versions (subscription- or item-level). */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const s = sub as unknown as {
    current_period_end?: number
    items?: { data?: { current_period_end?: number }[] }
  }
  const unix = s.current_period_end ?? s.items?.data?.[0]?.current_period_end
  return unix ? new Date(unix * 1000) : null
}

async function syncSubscription(stripeSub: Stripe.Subscription) {
  const workspaceId = stripeSub.metadata?.workspaceId
  if (!workspaceId) return
  const priceId = stripeSub.items.data[0]?.price.id
  const plan = (priceId && planForPriceId(priceId)) || 'STARTER'
  const customerId =
    typeof stripeSub.customer === 'string' ? stripeSub.customer : stripeSub.customer.id
  const data = {
    plan,
    status: stripeSub.status,
    stripeSubscriptionId: stripeSub.id,
    currentPeriodEnd: periodEnd(stripeSub),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
  }
  await db.subscription.upsert({
    where: { workspaceId },
    create: { workspaceId, stripeCustomerId: customerId, ...data },
    update: data,
  })
}

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = verifyWebhook(body, sig)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.subscription) {
        const stripeSub = await getStripe().subscriptions.retrieve(String(session.subscription))
        await syncSubscription(stripeSub)
      }
      break
    }
    case 'customer.subscription.updated': {
      await syncSubscription(event.data.object as Stripe.Subscription)
      break
    }
    case 'customer.subscription.deleted': {
      const stripeSub = event.data.object as Stripe.Subscription
      const workspaceId = stripeSub.metadata?.workspaceId
      if (workspaceId) {
        await db.subscription.updateMany({
          where: { workspaceId },
          data: { plan: 'STARTER', status: 'canceled' },
        })
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
