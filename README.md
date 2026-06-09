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

## Prerequisites

- **Node 22** (`.nvmrc` provided — run `nvm use`).
- **PostgreSQL** — a local instance, a Docker container, or a Neon database.

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

### Email & Google (optional locally)

- **Email:** when `RESEND_API_KEY` is unset, verification / reset / invite links
  are printed to the server console instead of being emailed — so everything is
  testable without an email provider.
- **Google sign-in:** set `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` from a Google
  OAuth client. Without them, email/password still works.

## Environment variables

See `.env.example`. Required: `DATABASE_URL`, `AUTH_SECRET`. Optional:
`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next core-web-vitals + jsx-a11y) |
| `npm test` | Vitest unit tests |
| `npm run e2e` | Playwright end-to-end tests |
| `npm run db:migrate` / `npm run db:deploy` | Prisma migrations (dev / prod) |

## Deploying (going live)

The app is built to deploy on Vercel + a managed Postgres (Neon). To go live you
supply the accounts only you can own:

1. Create a Postgres database (Neon) and set `DATABASE_URL`.
2. `npx auth secret` value → set `AUTH_SECRET` in the host's env.
3. (Optional) Google OAuth credentials → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`,
   with the deployed callback URL registered.
4. (Optional) `RESEND_API_KEY` + a verified `EMAIL_FROM` to send real email.
5. Set `APP_URL` to the production URL.
6. Run `npm run db:deploy` against the production database (CI does this too).

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, a Prisma
migration, build, and E2E on every push/PR.

## Roadmap

See `docs/superpowers/specs/` and `docs/superpowers/plans/` for the phased plan.
Phase 1: workflow builder · Phase 2: execution engine + connectors ·
Phase 3: Stripe billing · Phase 4: productionization (security, monitoring, legal).

---

Designed & built by [SEIDO](https://seido-blond.vercel.app).
