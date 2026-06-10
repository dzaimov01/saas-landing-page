# Cadence Phase 4 — Productionization (LTS) Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Security headers, rate limiting, structured logging, Sentry, health check, legal pages, honest landing copy, SEO, and a deploy checklist.

**Tech Stack:** Next.js 15, `@sentry/nextjs`, ioredis, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase4-productionization-design.md`

**Conventions:** Node 22, `npm`, commit per milestone, Postgres :5433, Redis :6380, test port 3100. Build must stay green with no Sentry/Redis/Stripe env.

---

## Milestone A — Security headers
- [ ] In `next.config.mjs` add async `headers()` returning the header set (spec §1) for `source: '/(.*)'`. Keep `outputFileTracingRoot` + reactStrictMode.
- [ ] `npm run build` green; `npm run dev` then `curl -I localhost:3000` shows `x-frame-options: DENY`.
- [ ] Commit: `feat: security response headers`.

## Milestone B — Rate limiting

### Task B1: `lib/ratelimit.ts` (TDD)
- [ ] `npm install ioredis`. Implement a lazy ioredis client from `env.REDIS_URL` and:
```ts
export async function rateLimit(key: string, opts: { limit: number; windowSec: number }):
  Promise<{ ok: boolean; remaining: number; retryAfter: number }>
export function clientIp(req: Request): string
```
Redis fixed window: `const n = await redis.incr(k); if (n===1) await redis.expire(k, windowSec); const ttl = await redis.ttl(k)`. No `REDIS_URL` ⇒ `{ ok:true, remaining:limit, retryAfter:0 }`.
- [ ] Test `lib/ratelimit.test.ts` with a mocked client (`vi.hoisted`): under limit ok; at limit not ok with retryAfter; disabled path returns ok. (Inject the client via a module-level setter or mock the ioredis import.)
- [ ] Red→green. Commit: `feat: redis rate limiter (tdd)`.

### Task B2: Wire rate limits
- [ ] `POST /api/signup`: `rateLimit('signup:'+clientIp(req), {limit:5,windowSec:600})` → 429 + `Retry-After` when `!ok`.
- [ ] `POST /api/password-reset/request`: `rateLimit('pwreset:'+ip, {limit:5,windowSec:600})`.
- [ ] `POST /api/hooks/[token]`: `rateLimit('hook:'+token, {limit:60,windowSec:60})`.
- [ ] `POST /api/billing/checkout`: `rateLimit('checkout:'+user.id, {limit:10,windowSec:60})`.
- [ ] `npm run typecheck`. Commit: `feat: apply rate limits to signup, reset, webhook, checkout`.

## Milestone C — Logging + safe errors

### Task C1: `lib/logger.ts` (TDD)
- [ ] `logger.info/warn/error(message, meta?)`: in prod emit `JSON.stringify({level,message,...meta,time})`; in dev a readable line. `apiError(e, route)` logs + returns `NextResponse.json({error:'Internal error'},{status:500})`.
- [ ] Test: `logger.error` calls `console.error` once; output parses as JSON in prod mode. Commit: `feat: structured logger + safe api error (tdd)`.
- [ ] Replace `console.warn/error` in `worker/index.ts`, `lib/workflows.ts`, `lib/connectors/slack.ts`, `lib/email.ts` with `logger.*`. Commit folded in.

## Milestone D — Sentry

### Task D1: Install + config
- [ ] `npm install @sentry/nextjs`.
- [ ] Add to `lib/env.ts`: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (optional).
- [ ] `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`: `if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) Sentry.init({ dsn, tracesSampleRate: 0.1 })`.
- [ ] `instrumentation.ts`:
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') await import('./sentry.server.config')
  if (process.env.NEXT_RUNTIME === 'edge') await import('./sentry.edge.config')
}
export { captureRequestError as onRequestError } from '@sentry/nextjs'
```
- [ ] Wrap `next.config.mjs` export with `withSentryConfig(nextConfig, { silent: true, telemetry: false })` (uploads source maps only when `SENTRY_AUTH_TOKEN` present — default no upload).
- [ ] Verify build green **without** Sentry env: `mv .env .env.bak && NEXT_PHASE=phase-production-build env -i PATH=$PATH HOME=$HOME npx next build` → ok; restore.
- [ ] Commit: `feat: optional Sentry monitoring (inert without DSN)`.

## Milestone E — Health check
- [ ] `app/api/health/route.ts`: `export const dynamic='force-dynamic'`; `await db.$queryRaw\`SELECT 1\``; ping Redis if `REDIS_URL`. Return `{status:'ok',db:'ok',redis}` 200, or 503 on DB failure.
- [ ] `curl localhost:3000/api/health` → 200. Commit: `feat: health check endpoint`.

## Milestone F — Legal pages
- [ ] `app/(legal)/terms/page.tsx` + `app/(legal)/privacy/page.tsx`: real template copy, `id="main"`, max-w prose, last-updated date, `[Company]`/contact placeholders, link back to `/`.
- [ ] `components/marketing/Footer.tsx`: point `Security`→`/privacy`? No — add `Terms`/`Privacy` to the Company column and link them (replace those `#`); leave other `#` items.
- [ ] `npm run build`. Commit: `feat: terms + privacy pages, footer links`.

## Milestone G — Landing reconciliation (copy)
- [ ] `Hero.tsx`: change the `Counter to={300} suffix="+"` stat label/number to honest copy — set `to={20}` `suffix="+"` label `integrations & APIs` (or remove the inflated "+"). Keep layout.
- [ ] `Features.tsx`: big-card stats — change `300+` integrations stat to `12` (or honest), and the `Plug` card title `300+ integrations` → `Connect your stack`, desc "HTTP, email, Slack and a growing library." Frame `99.9%` stat label as `target reliability`.
- [ ] `npm run build`. Commit: `chore: reconcile landing claims with reality`.

## Milestone H — SEO
- [ ] `app/robots.ts` (allow all + sitemap URL from `APP_URL`) and `app/sitemap.ts` (`/`, `/terms`, `/privacy`).
- [ ] `npm run build` shows `/robots.txt` + `/sitemap.xml`. Commit: `feat: robots + sitemap`.

## Milestone I — Deploy checklist
- [ ] `docs/DEPLOYMENT.md`: ordered go-live checklist (spec §9). Link from README.
- [ ] Commit: `docs: production deployment checklist`.

## Milestone J — Verify

### Task J1: E2E + gate
- [ ] `e2e/production.spec.ts`: `/terms` + `/privacy` render an `h1`; a `page.request.get('/')` response has `x-frame-options` = `DENY` and `x-content-type-options` = `nosniff`; `GET /api/health` → 200 JSON `db: 'ok'`.
- [ ] `npm run typecheck && lint && test && build && e2e` green.
- [ ] Commit: `test: productionization e2e`.

---

## Self-Review notes
- **Spec coverage:** headers (A) ✓, ratelimit (B) ✓, logger (C) ✓, sentry (D) ✓, health (E) ✓, legal (F) ✓, copy (G) ✓, seo (H) ✓, checklist (I) ✓, tests (J) ✓.
- **Build-safe:** Sentry/Redis/Stripe all optional; verified in D1/J1.
- **Deferred:** enforcing CSP, SOC2, WAF, i18n.
