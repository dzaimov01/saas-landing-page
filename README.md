# Cadence

Workflow-automation SaaS — connect your tools and run repetitive team workflows
automatically. Part of the [SEIDO](https://github.com/dzaimov01/seido) portfolio.

This repository is being built to a sellable V1 in phases. **Phase 0 (this
release)** delivers the production foundation: the marketing site, authentication,
multi-tenant workspaces with roles, the authenticated app shell, and the full
test/CI/deploy toolchain. Later phases add the workflow builder, execution engine,
connectors, and Stripe billing.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS · Framer Motion ·
Auth.js v5 (email/password + Google) · Prisma 6 + PostgreSQL · Resend ·
Vitest + Playwright · deployed on Vercel.

## What works today

- Marketing landing page at `/` (animated hero, bento features, pricing toggle).
- Sign up / log in with email + password or Google; soft email verification;
  password reset.
- A personal workspace is created on signup; invite teammates with OWNER / ADMIN /
  MEMBER roles, change roles, and remove members (RBAC-enforced).
- Authenticated app shell at `/app` with workspace switcher and settings
  (profile, workspace, members; billing is a placeholder until Phase 3).
- **Visual workflow builder** (`/app/workflows/[id]`) — React Flow canvas with
  trigger/action/condition nodes, branching, schema-driven config, and validation.
- **Execution engine** — webhook + schedule triggers enqueue runs onto a BullMQ
  queue; a worker executes the graph through real connectors (HTTP, email, Slack,
  delay) with `{{...}}` templating and branching conditions; results appear in the
  run monitor (`/app/runs`).
- **Billing** — Stripe Checkout + Customer Portal for the three tiers, with hard
  plan-limit enforcement (workflow count + monthly run quota) and a usage dashboard
  at `/app/settings/billing`. Without Stripe keys, everyone stays on the free
  Starter plan and the app still works.
- **Connections** — reusable, **encrypted** (AES-256-GCM) credentials at
  `/app/connections` for Slack, Discord, Telegram, Airtable, Notion, and OpenAI;
  workflow steps reference a connection instead of pasting keys.
- **Connectors** — HTTP request, email, Slack, Discord, Telegram, Airtable, Notion,
  OpenAI (AI completion), plus utility Set-data, Filter, Delay, and Condition steps.
- **Templates** — a `/app/templates` gallery of ready-to-go workflows; "Use template"
  clones one into your workspace to configure.

## Prerequisites

- **Node 22** (`.nvmrc` provided — run `nvm use`).
- **PostgreSQL** — a local instance, a Docker container, or a Neon database.
- **Redis** — for the execution engine (BullMQ). Local Docker or Upstash in prod.

## Local development

```bash
nvm use                 # Node 22
npm install
cp .env.example .env     # then fill in the values below
npx auth secret          # writes AUTH_SECRET into .env.local
# set DATABASE_URL in .env to your Postgres instance
npx prisma migrate dev   # create tables
npm run dev              # http://localhost:3000
```

Spin up Postgres quickly with Docker:

```bash
docker run -d --name cadence-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=cadence -p 5432:5432 postgres:16
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cadence?schema=public"
```

### Running the execution engine

Workflows execute on a BullMQ worker backed by Redis. Start Redis, set
`REDIS_URL`, then run the worker alongside the app:

```bash
docker run -d --name cadence-redis -p 6379:6379 redis:7-alpine
# REDIS_URL="redis://localhost:6379"
npm run worker          # separate terminal — processes the "runs" queue
```

With the worker running, "Run now", webhook posts (`/api/hooks/<token>`), and
schedule triggers all execute and stream into the run monitor (`/app/runs`).

### Email & Google (optional locally)

- **Email:** when `RESEND_API_KEY` is unset, verification / reset / invite links
  are printed to the server console instead of being emailed — so everything is
  testable without an email provider.
- **Google sign-in:** set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` from a Google
  OAuth client. Without them, email/password still works.

### Billing (optional locally)

Without Stripe keys, every workspace is on the free **Starter** plan and the app
works fully. To enable upgrades:

```bash
# set STRIPE_SECRET_KEY (test mode) in .env, then:
npm run stripe:setup     # creates products/prices, prints the 4 STRIPE_PRICE_* IDs
# add those + STRIPE_WEBHOOK_SECRET to .env
# locally, forward webhooks: stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`. Execution engine:
`REDIS_URL`. Connections: `ENCRYPTION_KEY` (`openssl rand -base64 32`). Billing:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, four `STRIPE_PRICE_*`. Optional:
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`,
`SENTRY_DSN`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next core-web-vitals + jsx-a11y) |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run worker` | BullMQ worker that executes workflow runs |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrations (dev / prod) |

## Deploying (going live)

> Full step-by-step checklist: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

The app is built to deploy on Vercel + a managed Postgres (Neon). To go live you
supply the accounts only you can own:

1. Create a Postgres database (Neon) and set `DATABASE_URL`.
2. `npx auth secret` value → set `AUTH_SECRET` in the host's env.
3. (Optional) Google OAuth credentials → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`,
   with the deployed callback URL registered.
4. (Optional) `RESEND_API_KEY` + a verified `EMAIL_FROM` to send real email.
5. Set `APP_URL` to the production URL.
6. Run `npm run db:deploy` against the production database (CI does this too).
7. **Execution engine:** provision a managed Redis (Upstash; `rediss://...`) and
   set `REDIS_URL`. The Next.js app deploys on Vercel, but the BullMQ **worker is
   a long-running process Vercel cannot host** — run `npm run worker` on an
   always-on host (Railway/Render/Fly/a VM) pointed at the same Postgres + Redis.
8. **Billing:** set `STRIPE_SECRET_KEY`, run `npm run stripe:setup`, add the four
   `STRIPE_PRICE_*`, and create a Stripe webhook to `/api/stripe/webhook` →
   set `STRIPE_WEBHOOK_SECRET`.

> **Build note:** the Vercel build runs `prisma generate && next build` (no
> `migrate deploy` — migrations run via `npm run db:deploy` / CI), and env
> validation is skipped during the build so the app builds before secrets are set.
> Set the env vars above in the Vercel project, then run `npm run db:deploy` once
> against the production database.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, a Prisma
migration, build, and E2E (with Postgres + Redis services) on every push/PR.

## Roadmap

See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the phased plan.
✅ Phase 1: workflow builder · ✅ Phase 2: execution engine + connectors ·
✅ Phase 3: Stripe billing + plan enforcement · ✅ Phase 4: productionization
(security, monitoring, legal) · ✅ Phase 5: encrypted Connections, more
integrations, and a template library.

---

Designed & built by [SEIDO](https://seido-blond.vercel.app).
