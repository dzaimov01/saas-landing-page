# Cadence — Build to Sellable V1: Roadmap + Phase 0 (Foundation) Design

**Date:** 2026-06-09
**Status:** Approved (Phase 0)
**Author:** Brainstormed with user

---

## Context

Cadence is currently a single-page marketing landing page (Vite + React 18 +
Tailwind + Framer Motion, ~540 lines, 8 components) for a *fictional*
workflow-automation SaaS. It advertises a product that does not exist: a visual
automation builder, 300+ integrations, an execution engine, SOC 2, SSO, run
quotas, and three paid tiers.

The goal is to turn this into a **real, sellable V1 product** — a genuinely
functional, deployable, billable workflow-automation SaaS — not a polish pass on
the landing page.

### Decisions made during brainstorming

- **Scope:** Broader V1 (thin real vertical slice + more connectors, team/
  workspace roles, richer builder), decomposed into sequential phases.
- **Stack:** Next.js (App Router) + Postgres + Stripe, deployed on Vercel. The
  existing landing page is absorbed into the Next.js app as the public marketing
  route.
- **ORM:** Prisma.
- **Auth:** Email + password **and** Google OAuth.
- **Build order:** Sequential, Phase 0 → 4. Each phase ships a working product on
  `main` and deploys before the next begins.

### Honest "ready to sell" caveat

At the end of Phase 4 the product is functional, deployable, and billable. To
actually go live, the owner must supply accounts only they can own: a Stripe
account, a Postgres host, a Resend/Slack app, and a domain. The build targets
test-mode credentials with documented handoff points to flip to live. Claims that
code alone cannot deliver (e.g. "SOC 2 compliant") are out of scope and the
landing-page copy is reconciled with reality in Phase 4.

---

## Roadmap (each phase = its own spec → plan → implementation cycle)

| Phase | Title | Outcome |
|-------|-------|---------|
| **0** | **Foundation** | Next.js migration, auth, DB, workspaces/roles, app shell, CI, deploy. *(This document.)* |
| 1 | Workflow builder | Workflow data model + builder UI + workflow list. |
| 2 | Execution engine & connectors | Schedule + webhook triggers, sequential executor with retries, run history/monitor, connectors (HTTP, email, Slack, condition, delay). |
| 3 | Billing & plan enforcement | Stripe products/prices for the three tiers, Checkout + portal, webhooks → subscription state, plan-limit enforcement. |
| 4 | Productionization (LTS) | Security hardening, error monitoring/logging, legal pages, reconcile landing claims, docs/runbook, production deploy checklist. |

---

## Phase 0 — Foundation: Design

### Tech baseline

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 3 ·
Framer Motion · Auth.js v5 (NextAuth) · Prisma · Postgres (Neon) · Resend
(transactional email) · deployed on Vercel.

### 1. Migration: landing page → Next.js (in place)

Convert the repo from Vite to Next.js. The 8 existing components port nearly
verbatim (already React + Tailwind + lucide + Framer Motion).

- Add `"use client"` to interactive/animated components (Nav, Hero, Features,
  Pricing, Counter).
- Move `index.html` `<head>` content into `app/layout.tsx` `metadata`.
- Load Sora + Manrope via `next/font/google` instead of the Google CDN `<link>`
  (no render-blocking request, no layout shift).
- Keep `tailwind.config` and `index.css` (becomes `app/globals.css`).
- The marketing page renders at `/` and **must look identical** to the current
  site.
- **Fix the Tailwind token collision** during the port: rename the custom color
  `base` (`#08080d`) to `ink`, updating every `text-base`/`bg-base`/`from-base`
  usage across components and CSS. (`text-base` currently collides with
  Tailwind's built-in font-size utility.)

### 2. Directory structure

```
app/
  (marketing)/page.tsx          # ported landing page
  (auth)/
    login/page.tsx
    signup/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    verify-email/page.tsx
  (app)/app/
    page.tsx                    # dashboard home (empty state)
    settings/
      profile/page.tsx
      workspace/page.tsx
      members/page.tsx
      billing/page.tsx          # placeholder until Phase 3
  api/
    auth/[...nextauth]/route.ts
    signup/route.ts
    password-reset/route.ts     # request + confirm
    invitations/route.ts        # create + accept
  layout.tsx                    # root layout, fonts, metadata
  globals.css
components/
  ui/                           # buttons, inputs, dialog, etc.
  marketing/                    # Nav, Hero, Logos, Features, Pricing, CTA, Footer, Counter
  app/                          # sidebar, topbar, workspace switcher, user menu
lib/
  auth.ts                       # Auth.js config
  db.ts                         # Prisma client singleton
  rbac.ts                       # requireWorkspaceRole helper
  email.ts                      # Resend wrapper + dev console fallback
  env.ts                        # zod-validated env
prisma/
  schema.prisma
  migrations/
middleware.ts                   # guards /app/*
```

### 3. Data model (Prisma)

- `User` — `id`, `name`, `email` (unique), `emailVerified`, `image`,
  `passwordHash` (nullable for OAuth-only accounts), `createdAt`.
- Auth.js adapter models: `Account`, `Session`, `VerificationToken`.
- `Workspace` — `id`, `name`, `slug` (unique), `createdAt`.
- `Membership` — `userId`, `workspaceId`, `role` enum `OWNER|ADMIN|MEMBER`,
  `createdAt`; unique on (`userId`, `workspaceId`).
- `Invitation` — `id`, `workspaceId`, `email`, `role`, `token`, `expiresAt`,
  `invitedById`, `acceptedAt` (nullable).
- `PasswordResetToken` — `id`, `userId`, `token`, `expiresAt`.

On signup, a personal workspace is auto-created with the user as `OWNER`.

### 4. Auth & access control

- Auth.js v5: Credentials provider (bcrypt-hashed passwords) + Google provider;
  Prisma adapter; **JWT session strategy** (required for the Credentials
  provider).
- Flows: signup → email verification; login; forgot/reset password; Google
  sign-in (auto-creates user + personal workspace on first login).
- Transactional email via Resend, with a **dev fallback that logs the action
  link to the console** when `RESEND_API_KEY` is unset — reset/verify work
  locally without credentials.
- `middleware.ts` redirects unauthenticated requests to `/app/*` → `/login`.
- `requireWorkspaceRole(workspaceId, roles[])` server helper enforces RBAC:
  - OWNER: manage members, rename/delete workspace.
  - ADMIN: manage members.
  - MEMBER: view only.
- Active workspace stored in a cookie; a switcher in the top bar changes it.

### 5. App shell

Authenticated `/app` layout:

- Sidebar: Workflows · Runs · Connections · Settings. The first three render
  empty-state placeholders in Phase 0 (filled in Phases 1–2).
- Top bar: workspace switcher + user menu (sign out, settings).
- Real in Phase 0:
  - Dashboard home empty state.
  - Settings → Profile (name, email, password change).
  - Settings → Workspace (rename, slug; delete for OWNER).
  - Settings → Members (list members, invite by email, change role, remove;
    gated by RBAC).
  - Settings → Billing (placeholder until Phase 3).

### 6. Tooling, CI, deploy

- TypeScript strict; ESLint (`next/core-web-vitals` + `jsx-a11y`); Prettier.
- zod-validated environment via `lib/env.ts`; `.env.example` documents every key.
- **Testing harness established now** (later phases inherit it):
  - Vitest + React Testing Library — unit/component (password hashing, RBAC
    guard, slug util, a key component).
  - Playwright — one E2E happy path: signup → verify → land in `/app`.
- GitHub Actions CI: typecheck + lint + unit tests + `prisma validate` + build.
- Deploy: Vercel + Neon Postgres. README + `.env.example` document required keys
  and test→live handoff points.

### 7. Verification (Phase 0 "done" criteria)

- `build`, `typecheck`, `lint`, unit tests, and the Playwright E2E all pass.
- Prisma migration applies cleanly to a fresh database.
- The marketing page visually matches the current site.
- A Vercel preview deploy loads; signup, Google sign-in, login, and password
  reset all work end to end.

### Out of scope for Phase 0

- Workflow model/builder (Phase 1).
- Execution engine + connectors (Phase 2).
- Stripe / billing (Phase 3) — the Billing settings page is a placeholder.
- Real production credentials (owner-supplied at go-live).
