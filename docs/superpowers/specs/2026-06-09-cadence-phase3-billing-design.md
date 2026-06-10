# Cadence Phase 3 — Billing & Plan Enforcement (+ Deploy Fix) Design

**Date:** 2026-06-09
**Status:** Approved
**Depends on:** Phases 0–2, merged to `main`.

---

## Goals

1. Fix the failing Vercel deployment.
2. Monetize: Stripe-backed subscriptions for the three tiers, with hard plan-limit
   enforcement and a billing UI.

## Decisions (from brainstorming)

- **Stripe:** hosted Checkout + Customer Portal; webhooks sync state to the DB.
- **Enforcement:** hard block on exceeding plan limits, with upgrade prompts (HTTP 402).
- Billing is **per workspace**. No Stripe keys ⇒ everyone on Starter (free); the app
  still works.

---

## Part 0 — Vercel deploy fix

Root cause (reproduced): `vercel.json` build command runs `prisma migrate deploy`,
which fails because `DATABASE_URL` is absent in Vercel's build env; and `next build`
itself fails because `lib/env.ts` strictly validates env at import, which Next
evaluates while collecting page data for route handlers.

Fixes:
- `vercel.json` `buildCommand` → `prisma generate && next build` (migrations are not
  a build step; run `npm run db:deploy` separately / via CI).
- `lib/env.ts` is **build-safe**: when `process.env.NEXT_PHASE === 'phase-production-build'`,
  skip strict `.parse` and return the raw (possibly-empty) values; at runtime, validate
  as before. This lets the build succeed without secrets while keeping runtime fail-fast.
- Document required Vercel env vars; set `AUTH_SECRET` + `APP_URL` via CLI. `DATABASE_URL`
  (Neon), `REDIS_URL` (Upstash), and Stripe keys are owner-supplied.

---

## Part 1 — Plans (`lib/plans.ts`)

```ts
type PlanKey = 'STARTER' | 'TEAM' | 'SCALE'
interface Plan {
  key: PlanKey
  name: string
  maxWorkflows: number        // Infinity for unlimited
  maxRunsPerMonth: number
  priceIds: { monthly?: string; annual?: string } // from env
}
```
- STARTER: 3 workflows, 500 runs/mo, no price.
- TEAM: Infinity workflows, 25_000 runs/mo, env `STRIPE_PRICE_TEAM_MONTHLY|ANNUAL`.
- SCALE: Infinity workflows, 250_000 runs/mo, env `STRIPE_PRICE_SCALE_MONTHLY|ANNUAL`.
- Helpers: `getPlan(key)`, `planForPriceId(id)`, `checkWorkflowLimit(plan, count)`,
  `checkRunQuota(plan, runsThisMonth)` → boolean. Pure, unit-tested.

## Part 2 — Data model (Prisma)

```prisma
enum PlanKey { STARTER TEAM SCALE }

model Subscription {
  id                   String    @id @default(cuid())
  workspaceId          String    @unique
  plan                 PlanKey   @default(STARTER)
  status               String    @default("active") // active|trialing|past_due|canceled
  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  currentPeriodEnd     DateTime?
  cancelAtPeriodEnd    Boolean   @default(false)
  updatedAt            DateTime  @updatedAt
  workspace            Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
}
```
`Workspace` gains `subscription Subscription?`. Absence ⇒ Starter.

## Part 3 — Stripe (`lib/stripe.ts`)

- `getStripe()` returns a Stripe client from `STRIPE_SECRET_KEY`, or `null` when unset
  (`billingEnabled()` helper). Env adds `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  the four price IDs (all optional).
- `createCheckoutSession({ workspace, customerId, priceId, successUrl, cancelUrl })`.
- `createPortalSession({ customerId, returnUrl })`.
- `verifyWebhook(rawBody, signature)` → Stripe event.

## Part 4 — Routes

- `POST /api/billing/checkout` — auth + `requireWorkspaceRole(ADMIN)`; body `{ plan, interval }`;
  ensure a Stripe customer exists (create + persist on Subscription); create a Checkout
  session for the matching price; return `{ url }`. 400 when billing disabled.
- `POST /api/billing/portal` — ADMIN; create a Portal session for the workspace's customer;
  return `{ url }`.
- `POST /api/stripe/webhook` — raw body; `verifyWebhook`; handle
  `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  → upsert `Subscription` (plan via `planForPriceId`, status, period, cancelAtPeriodEnd).
  Runtime: Node (needs raw body).

## Part 5 — Enforcement (`lib/billing.ts`)

- `getWorkspacePlan(workspaceId)` → `Plan` (Subscription plan when status active/trialing, else STARTER).
- `runsThisMonth(workspaceId)` → count of `WorkflowRun` since the start of the current UTC month.
- `class PlanLimitError extends Error { code: 'workflow_limit' | 'run_quota' }`.
- `assertCanCreateWorkflow(workspaceId)` — throws `PlanLimitError('workflow_limit')` when at cap.
- `assertWithinRunQuota(workspaceId)` — throws `PlanLimitError('run_quota')` when at cap.
- Wiring:
  - `POST /api/workflows` → `assertCanCreateWorkflow` (402 + message on throw).
  - Run triggers create a run only after `assertWithinRunQuota`: `/api/hooks/[token]`,
    `/api/workflows/[id]/run` (402), and the **worker** scheduled path (skips the run if over quota).

## Part 6 — Billing UI (`/app/settings/billing`)

Replaces the placeholder. Server-loads plan + usage; client renders:
- Current plan + status; **usage meters**: workflows used / limit, runs this month / limit.
- Monthly/annual toggle + **Upgrade** buttons (Team, Scale) → `POST /api/billing/checkout` → redirect.
- **Manage billing** → `POST /api/billing/portal` → redirect (when subscribed).
- "Billing isn't configured yet" state when `!billingEnabled()`.

## Part 7 — Setup script (`scripts/stripe-setup.ts`, `npm run stripe:setup`)

Idempotently creates Stripe Products (Team, Scale) + Prices (GBP, monthly + annual,
annual = 20% off) using `STRIPE_SECRET_KEY`, then prints the four price IDs to copy
into env. Safe to re-run (looks up by product metadata).

## Testing

- **Unit:** `checkWorkflowLimit` / `checkRunQuota`; `planForPriceId`; `getWorkspacePlan`
  (mocked db); webhook event → subscription upsert mapping (mocked stripe + db).
- **Integration (real DB):** `assertCanCreateWorkflow` throws at the Starter cap;
  `assertWithinRunQuota` throws past the run cap.
- **E2E:** `/app/settings/billing` renders the current plan + usage meters and, with
  Stripe unconfigured, shows the "not configured" state (deterministic). No live Stripe.

## Out of scope (later)

- Proration UX, usage metering/overages, per-seat billing, dunning emails, tax.
- Live Stripe Checkout E2E (covered by unit/integration + manual test-mode verification).
