# Cadence — Production Deployment Checklist

A step-by-step guide to taking Cadence live. The Next.js app runs on Vercel; the
execution worker runs on a separate always-on host.

## 1. Provision infrastructure
- [ ] **Postgres** — create a database (e.g. Neon). Copy its pooled connection string.
- [ ] **Redis** — create a Redis instance (e.g. Upstash). Copy the `rediss://` URL.
- [ ] **Domain** — decide the production URL (e.g. `https://app.yourdomain.com`).

## 2. Configure environment (Vercel project → Settings → Environment Variables)
- [ ] `DATABASE_URL` — Postgres connection string.
- [ ] `REDIS_URL` — Redis URL.
- [ ] `AUTH_SECRET` — generate with `npx auth secret`.
- [ ] `APP_URL` — the production URL.
- [ ] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — (optional) Google OAuth; register the
      callback `https://<APP_URL>/api/auth/callback/google`.
- [ ] `RESEND_API_KEY` + `EMAIL_FROM` — (optional) transactional email.
- [ ] Sentry (optional): `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, and for source maps
      `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT`.

## 3. Database
- [ ] Run migrations against production once: `DATABASE_URL=... npm run db:deploy`.
      (The Vercel build does **not** run migrations.)

## 4. Deploy the app
- [ ] Connect the GitHub repo to Vercel (or `vercel --prod`). The build runs
      `prisma generate && next build`.
- [ ] Verify the deployment is **Ready** and the marketing page loads at `/`.

## 5. Run the worker (off-Vercel)
- [ ] Deploy a small always-on Node service (Railway/Render/Fly/VM) from this repo.
- [ ] Set `DATABASE_URL` and `REDIS_URL` (same as the app) in its environment.
- [ ] Start command: `npm run worker`.
- [ ] Confirm its logs show `worker: listening on "runs" queue`.

## 6. Billing (Stripe)
- [ ] Set `STRIPE_SECRET_KEY` (live or test).
- [ ] Run `npm run stripe:setup` to create products/prices; copy the four
      `STRIPE_PRICE_*` IDs into Vercel env.
- [ ] Create a webhook endpoint in Stripe → `https://<APP_URL>/api/stripe/webhook`
      for `checkout.session.completed`, `customer.subscription.updated`,
      `customer.subscription.deleted`; set `STRIPE_WEBHOOK_SECRET`.

## 7. Monitoring
- [ ] Point an uptime monitor at `GET https://<APP_URL>/api/health` (expects 200
      with `db: "ok"`).
- [ ] Confirm Sentry receives a test event (optional).

## 8. Smoke test
- [ ] Sign up, create a workspace, build a workflow.
- [ ] Trigger it via "Run now" and confirm a run reaches **Succeeded** in `/app/runs`.
- [ ] (Stripe) Upgrade via Checkout in test mode; confirm the plan updates after the
      webhook fires.

## Notes
- Security headers ship via `next.config.mjs`; CSP is Report-Only — review reports
  before enforcing.
- Rate limiting requires `REDIS_URL`; without it, limits are a no-op.
- Without Stripe keys, every workspace stays on the free Starter plan.
