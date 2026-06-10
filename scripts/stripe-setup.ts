/**
 * Idempotently creates Cadence's Stripe products + prices (GBP, monthly + annual)
 * and prints the price IDs to copy into your env.
 *
 * Usage: STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
 */
import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Set STRIPE_SECRET_KEY before running this script.')
  process.exit(1)
}
const stripe = new Stripe(key)

// monthly amounts in pence (GBP); annual billed yearly at the discounted monthly × 12
const TIERS = [
  { plan: 'team', name: 'Cadence Team', monthly: 2400, annualPerMonth: 1900 },
  { plan: 'scale', name: 'Cadence Scale', monthly: 7900, annualPerMonth: 6300 },
]

async function ensureProduct(planKey: string, name: string): Promise<string> {
  const found = await stripe.products.search({ query: `metadata['cadence_plan']:'${planKey}'` })
  if (found.data[0]) return found.data[0].id
  const created = await stripe.products.create({ name, metadata: { cadence_plan: planKey } })
  return created.id
}

async function ensurePrice(
  productId: string,
  planKey: string,
  interval: 'monthly' | 'annual',
  amount: number,
): Promise<string> {
  const found = await stripe.prices.search({
    query: `product:'${productId}' AND metadata['cadence_interval']:'${interval}'`,
  })
  if (found.data[0]) return found.data[0].id
  const created = await stripe.prices.create({
    product: productId,
    currency: 'gbp',
    unit_amount: amount,
    recurring: { interval: interval === 'annual' ? 'year' : 'month' },
    metadata: { cadence_plan: planKey, cadence_interval: interval },
  })
  return created.id
}

async function main() {
  const out: Record<string, string> = {}
  for (const tier of TIERS) {
    const productId = await ensureProduct(tier.plan, tier.name)
    const monthly = await ensurePrice(productId, tier.plan, 'monthly', tier.monthly)
    const annual = await ensurePrice(productId, tier.plan, 'annual', tier.annualPerMonth * 12)
    out[`STRIPE_PRICE_${tier.plan.toUpperCase()}_MONTHLY`] = monthly
    out[`STRIPE_PRICE_${tier.plan.toUpperCase()}_ANNUAL`] = annual
  }
  console.log('\nAdd these to your environment:\n')
  for (const [k, v] of Object.entries(out)) console.log(`${k}="${v}"`)
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
