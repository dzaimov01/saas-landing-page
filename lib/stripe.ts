import Stripe from 'stripe'
import { env } from './env'

let client: Stripe | null = null

export function billingEnabled(): boolean {
  return !!env.STRIPE_SECRET_KEY
}

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing).')
  }
  if (!client) client = new Stripe(env.STRIPE_SECRET_KEY)
  return client
}

export async function createCheckoutSession(args: {
  priceId: string
  workspaceId: string
  customerId?: string
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: args.priceId, quantity: 1 }],
    customer: args.customerId,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    metadata: { workspaceId: args.workspaceId },
    subscription_data: { metadata: { workspaceId: args.workspaceId } },
  })
}

export async function createPortalSession(args: {
  customerId: string
  returnUrl: string
}): Promise<Stripe.BillingPortal.Session> {
  return getStripe().billingPortal.sessions.create({
    customer: args.customerId,
    return_url: args.returnUrl,
  })
}

export function verifyWebhook(rawBody: string, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET missing.')
  return getStripe().webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET)
}
