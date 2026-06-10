# Cadence Phase 3 — Billing & Plan Enforcement (+ Deploy Fix) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Fix the Vercel deploy, then add Stripe subscriptions for the 3 tiers with hard plan-limit enforcement and a billing UI.

**Tech Stack:** Next.js 15, Prisma 6, Stripe (hosted Checkout + Portal), zod, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase3-billing-design.md`

**Conventions:** Node 22, `npm`, commit per task, Postgres :5433, Redis :6380, test server :3100.

---

## Milestone A — Vercel deploy fix

### Task A1: Build-safe env + vercel.json
- [ ] `lib/env.ts`: add price/Stripe optional keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_TEAM_MONTHLY`, `STRIPE_PRICE_TEAM_ANNUAL`, `STRIPE_PRICE_SCALE_MONTHLY`, `STRIPE_PRICE_SCALE_ANNUAL`, all `.optional()`). Then make build-safe:
```ts
const raw = { DATABASE_URL: process.env.DATABASE_URL, /* …all keys… */ }
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'
export const env = isBuild
  ? (raw as unknown as z.infer<typeof schema>)
  : schema.parse(raw)
```
- [ ] `vercel.json` `buildCommand` → `"prisma generate && next build"`.
- [ ] Verify: `mv .env .env.bak && NEXT_PHASE=phase-production-build env -i PATH=$PATH HOME=$HOME npx next build` → succeeds; `mv .env.bak .env`.
- [ ] Commit: `fix: build-safe env + drop migrate from vercel build`.

---

## Milestone B — Plans

### Task B1: `lib/plans.ts` (TDD)
- [ ] Implement `PlanKey`, `PLANS` record, `getPlan(key)`, `planForPriceId(id)`, `checkWorkflowLimit(plan,count)`, `checkRunQuota(plan,runs)`.
```ts
export const PLANS = {
  STARTER: { key:'STARTER', name:'Starter', maxWorkflows:3, maxRunsPerMonth:500, priceIds:{} },
  TEAM:    { key:'TEAM', name:'Team', maxWorkflows:Infinity, maxRunsPerMonth:25_000,
             priceIds:{ monthly:process.env.STRIPE_PRICE_TEAM_MONTHLY, annual:process.env.STRIPE_PRICE_TEAM_ANNUAL } },
  SCALE:   { key:'SCALE', name:'Scale', maxWorkflows:Infinity, maxRunsPerMonth:250_000,
             priceIds:{ monthly:process.env.STRIPE_PRICE_SCALE_MONTHLY, annual:process.env.STRIPE_PRICE_SCALE_ANNUAL } },
} as const
export const checkWorkflowLimit = (p, n) => n < p.maxWorkflows
export const checkRunQuota = (p, n) => n < p.maxRunsPerMonth
```
- [ ] Test `lib/plans.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getPlan, checkWorkflowLimit, checkRunQuota } from './plans'
it('starter caps workflows at 3', () => {
  expect(checkWorkflowLimit(getPlan('STARTER'), 2)).toBe(true)
  expect(checkWorkflowLimit(getPlan('STARTER'), 3)).toBe(false)
})
it('team allows many workflows', () => expect(checkWorkflowLimit(getPlan('TEAM'), 999)).toBe(true))
it('starter run quota 500', () => {
  expect(checkRunQuota(getPlan('STARTER'), 499)).toBe(true)
  expect(checkRunQuota(getPlan('STARTER'), 500)).toBe(false)
})
```
- [ ] Red→green. Commit: `feat: plan definitions + limit helpers (tdd)`.

---

## Milestone C — Data model

### Task C1: Subscription model + migration
- [ ] Add `PlanKey` enum + `Subscription` model (spec) + `subscription Subscription?` on `Workspace`.
- [ ] `npx prisma validate && npx prisma generate`; create migration via `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_subscriptions/migration.sql`; `npx prisma migrate deploy`.
- [ ] Commit: `feat: subscription model + migration`.

---

## Milestone D — Stripe client + setup

### Task D1: `lib/stripe.ts`
- [ ] Install `stripe`. Implement `billingEnabled()` (`!!env.STRIPE_SECRET_KEY`), `getStripe()` (cached `new Stripe(env.STRIPE_SECRET_KEY)` or throw if disabled), `createCheckoutSession`, `createPortalSession`, `verifyWebhook(rawBody, sig)`.
- [ ] Commit: `feat: stripe client wrapper`.

### Task D2: `scripts/stripe-setup.ts` + script
- [ ] Idempotent: for Team & Scale create a Product (lookup by `metadata.cadence_plan`), then monthly + annual GBP Prices (£24/£19, £79/£63 → amounts in pence). Print the 4 price IDs. Add `"stripe:setup": "tsx --env-file-if-exists=.env scripts/stripe-setup.ts"`.
- [ ] Commit: `feat: stripe product/price setup script`.

---

## Milestone E — Enforcement

### Task E1: `lib/billing.ts` (TDD + integration)
- [ ] `getWorkspacePlan(workspaceId)`, `runsThisMonth(workspaceId)`, `PlanLimitError`, `assertCanCreateWorkflow`, `assertWithinRunQuota`.
- [ ] Unit test `getWorkspacePlan` with mocked db (active TEAM sub → TEAM; none → STARTER; canceled → STARTER).
- [ ] Integration test (real DB): create a workspace, create 3 workflows, `assertCanCreateWorkflow` throws `PlanLimitError` with code `workflow_limit`.
- [ ] Red→green. Commit: `feat: plan enforcement (tdd + integration)`.

### Task E2: Wire enforcement into routes
- [ ] `POST /api/workflows`: call `assertCanCreateWorkflow(workspaceId)`; on `PlanLimitError` return 402 `{ error, code }`.
- [ ] `POST /api/workflows/[id]/run` and `POST /api/hooks/[token]`: call `assertWithinRunQuota(workspaceId)` before creating the run; on throw return 402 (hooks: 429/402 JSON).
- [ ] `worker/index.ts` scheduled path: skip creating a run when over quota (log).
- [ ] `WorkflowList` "New workflow": surface a 402 with an upgrade message (toast/inline).
- [ ] `npm run typecheck`. Commit: `feat: enforce plan limits on create + run`.

---

## Milestone F — Billing routes

### Task F1: checkout + portal + webhook
- [ ] `POST /api/billing/checkout` (ADMIN; `{plan,interval}` → price; ensure customer; session; `{url}`; 400 if disabled).
- [ ] `POST /api/billing/portal` (ADMIN; `{url}`).
- [ ] `POST /api/stripe/webhook` (raw body via `req.text()`; `verifyWebhook`; upsert Subscription on the 3 events). `export const runtime = 'nodejs'`.
- [ ] `npm run typecheck`. Commit: `feat: billing checkout/portal/webhook routes`.

---

## Milestone G — Billing UI

### Task G1: `/app/settings/billing`
- [ ] Server page: `getWorkspacePlan`, workflow count, `runsThisMonth`, subscription. Pass to a client `BillingClient`.
- [ ] `BillingClient`: current plan + status, usage meters (workflows, runs), monthly/annual toggle, Upgrade buttons → checkout, Manage billing → portal; "not configured" state when `!billingEnabled`.
- [ ] `npm run build`. Commit: `feat: billing settings UI`.

---

## Milestone H — Verify, deploy env, docs

### Task H1: E2E
- [ ] `e2e/billing.spec.ts`: sign up → `/app/settings/billing` → assert "Starter" plan + usage meters visible; with Stripe unconfigured, assert the "not configured" message (no external call).
- [ ] `npm run e2e` green.
- [ ] Commit: `test: billing settings e2e`.

### Task H2: Final gate + Vercel env + docs
- [ ] `npm run typecheck && lint && test && build && e2e` green.
- [ ] Set Vercel env (best-effort, non-secret): `vercel env add APP_URL`, `AUTH_SECRET`; document `DATABASE_URL`, `REDIS_URL`, `STRIPE_*` as owner-supplied. Trigger a redeploy and confirm build succeeds.
- [ ] README + `.env.example`: Stripe vars, `npm run stripe:setup`, webhook secret, plan limits; Vercel env checklist.
- [ ] Commit: `docs: billing + deploy env`.

---

## Self-Review notes
- **Spec coverage:** deploy fix (A) ✓, plans (B) ✓, model (C) ✓, stripe+setup (D) ✓, enforcement (E) ✓, routes (F) ✓, UI (G) ✓, e2e+env+docs (H) ✓.
- **Type consistency:** `getPlan/planForPriceId/checkWorkflowLimit/checkRunQuota`, `getWorkspacePlan/runsThisMonth/assertCanCreateWorkflow/assertWithinRunQuota/PlanLimitError`, `billingEnabled/getStripe`.
- **Deferred:** proration, metering, seats, dunning, live Checkout E2E.
