# Cadence Phase 4 — Productionization (LTS) Design

**Date:** 2026-06-09
**Status:** Approved
**Depends on:** Phases 0–3, merged to `main`.

---

## Goal

Turn the feature-complete app into something genuinely operable and sellable:
security hardening, error monitoring, structured logging, health checks, legal
pages, honest marketing copy, SEO, and a deploy checklist.

## Decisions (from brainstorming)

- **Monitoring:** full `@sentry/nextjs`, guarded by `SENTRY_DSN` (inert without it).
- **Landing copy:** soften overstated claims to defensible wording.
- CSP ships **Report-Only** (avoids breaking Next inline bootstrap / Framer Motion /
  React Flow); other security headers enforce.
- Rate limiting is **Redis-backed** (reuses `REDIS_URL`), a **no-op when unset**.

## Components

### 1. Security headers (`next.config.mjs` `headers()`)
Applied to all routes:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Content-Security-Policy-Report-Only`: `default-src 'self'`, `img-src 'self' data:`,
  `style-src 'self' 'unsafe-inline'`, `script-src 'self' 'unsafe-inline'`,
  `connect-src 'self'`, `frame-ancestors 'none'`, `base-uri 'self'`.

### 2. Rate limiting (`lib/ratelimit.ts`)
- `rateLimit(key, { limit, windowSec }) → { ok, remaining, retryAfter }`.
- Redis fixed window: `INCR` a key, set `EXPIRE` on first hit. Uses a dedicated
  `ioredis` client from `REDIS_URL`; when unset, returns `{ ok: true }` (no-op).
- Applied: `POST /api/signup` (by IP), `POST /api/password-reset/request` (by IP),
  `POST /api/hooks/[token]` (by token), `POST /api/billing/checkout` (by user).
  On limit → 429 + `Retry-After`. `clientIp(req)` helper reads `x-forwarded-for`.
- Unit-tested with a mocked redis client (window increments, expiry on first hit,
  no-op when disabled).

### 3. Logging + safe errors (`lib/logger.ts`)
- `logger.info/warn/error(msg, meta?)`: JSON line in production, readable in dev;
  never logs secrets.
- `apiError(e, context)` helper: logs the error, returns `NextResponse` 500 with a
  generic message (no internals). Adopt in route `catch (e) { throw e }` spots and
  the worker.

### 4. Sentry (`@sentry/nextjs`)
- `instrumentation.ts`: `register()` imports the server/edge config; exports
  `onRequestError = Sentry.captureRequestError`.
- `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`:
  `Sentry.init({ dsn })` only when the DSN env is present (else no-op).
- `next.config.mjs` wrapped with `withSentryConfig` (telemetry off; source-map upload
  only when `SENTRY_AUTH_TOKEN` set). Env: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`,
  `SENTRY_AUTH_TOKEN` — all optional. Build must stay green without them.

### 5. Health check (`/api/health`)
- `GET` → `{ status, db, redis }`. DB: `SELECT 1`. Redis: ping only if `REDIS_URL` set.
  Returns 200 when DB ok, 503 otherwise. `export const dynamic = 'force-dynamic'`.

### 6. Legal pages
- `/terms` and `/privacy` static pages (`app/(legal)/...`) with real template copy and
  `[Company]` / contact placeholders. Footer Resources/Company columns link to them
  (replacing dead `#` links for those entries).

### 7. Landing reconciliation (copy only)
- Hero stat `300+ integrations` → `integrations & APIs` (drop the inflated count) or a
  modest honest number; Features `300+ integrations` card → "Connect your stack —
  HTTP, email, Slack, and a growing library"; frame `99.9%` / `12h` as illustrative
  (e.g. a small "illustrative" note or softened labels). No layout changes.

### 8. SEO
- `app/robots.ts` (allow all, point to sitemap) and `app/sitemap.ts` (marketing +
  legal URLs), based on `APP_URL`.

### 9. Deploy checklist (`docs/DEPLOYMENT.md`)
- Ordered go-live checklist: provision Postgres/Redis, set all env vars, `db:deploy`,
  deploy app to Vercel, host the worker off-Vercel, configure Stripe + webhook, set
  Sentry DSN, point an uptime monitor at `/api/health`, smoke test.

## Testing

- **Unit:** `rateLimit` (mocked redis: window increment, first-hit expiry, disabled
  no-op); `logger` (level filtering / shape); health logic.
- **E2E:** `/terms` + `/privacy` render headings; a response carries the security
  headers (`X-Frame-Options`, `X-Content-Type-Options`); `GET /api/health` → 200 with
  `db: 'ok'`.
- Build verified green with **no** Sentry/Redis/Stripe env (Vercel scenario).

## Out of scope

- Enforcing nonce-based CSP, SOC2/pen-test, WAF, anomaly detection, i18n, A/B testing.
