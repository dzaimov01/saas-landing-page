# Cadence Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vite landing page into a Next.js app with auth (email/password + Google), Postgres/Prisma, workspaces with roles, an authenticated app shell, a testing harness, and CI — a deployable foundation with the marketing page unchanged.

**Architecture:** Single Next.js 15 App Router project. The public marketing page lives at `/` (ported from the existing components). Authenticated product lives under `/app`, guarded by middleware. Auth.js v5 with JWT sessions backs Credentials + Google. Prisma/Postgres persists users, workspaces, memberships, invitations, and tokens. RBAC is enforced server-side per workspace. Transactional email goes through Resend with a console fallback in dev.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS 3, Framer Motion, Auth.js v5 (next-auth), Prisma, Postgres (Neon), bcrypt, Resend, zod, Vitest + React Testing Library, Playwright, GitHub Actions.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase0-foundation-design.md`

**Conventions for the whole plan:**
- Package manager: `npm`.
- Run all commands from the repo root.
- After each task's final step, commit. Commit messages use Conventional Commits.
- "Verify build" means `npm run build` exits 0.
- Resolved open points (from spec review): **email verification is soft** — users can enter `/app` immediately and see a "verify your email" banner. **Deploy is local-verify only** — the owner runs the deploy; this plan does not push to Vercel.

---

## File Structure (created by this plan)

```
package.json, tsconfig.json, next.config.mjs, postcss.config.js, tailwind.config.ts
.eslintrc.cjs, .prettierrc, .env.example, vitest.config.ts, playwright.config.ts
.github/workflows/ci.yml
prisma/schema.prisma
app/
  layout.tsx, globals.css
  (marketing)/page.tsx
  (auth)/login/page.tsx, signup/page.tsx, forgot-password/page.tsx,
         reset-password/page.tsx, verify-email/page.tsx
  (app)/app/layout.tsx, page.tsx
  (app)/app/settings/profile/page.tsx, workspace/page.tsx, members/page.tsx, billing/page.tsx
  api/auth/[...nextauth]/route.ts
  api/signup/route.ts
  api/password-reset/request/route.ts, api/password-reset/confirm/route.ts
  api/invitations/route.ts, api/invitations/accept/route.ts
components/
  marketing/Nav, Hero, Logos, Features, Pricing, CTA, Footer, Counter (.tsx)
  app/Sidebar.tsx, Topbar.tsx, WorkspaceSwitcher.tsx, UserMenu.tsx, VerifyBanner.tsx
  ui/Button.tsx, Input.tsx, Label.tsx, FormError.tsx
lib/
  env.ts, db.ts, auth.ts, password.ts, slug.ts, rbac.ts, email.ts, tokens.ts, workspace.ts
middleware.ts
tests/ (unit alongside lib via *.test.ts; e2e in e2e/)
e2e/auth.spec.ts
```

---

## Milestone A — Next.js migration (marketing page unchanged)

### Task A1: Snapshot the current site for visual comparison

**Files:** none (capture only)

- [ ] **Step 1: Install current deps and build the existing Vite app**

```bash
npm install
npm run build
```
Expected: `dist/` produced, exit 0.

- [ ] **Step 2: Record the current component inventory**

Run: `ls src/components`
Expected: `CTA.jsx Counter.jsx Features.jsx Footer.jsx Hero.jsx Logos.jsx Nav.jsx Pricing.jsx`
These are the files ported in Task A4. Do not delete `src/` until Task A6.

- [ ] **Step 3: Commit a checkpoint branch marker**

```bash
git add -A && git commit -m "chore: checkpoint before Next.js migration" --allow-empty
```

### Task A2: Scaffold Next.js config alongside the existing app

**Files:**
- Create: `next.config.mjs`, `tsconfig.json`, `next-env.d.ts` (generated)
- Modify: `package.json`
- Create: `.gitignore` additions

- [ ] **Step 1: Install Next.js and TypeScript toolchain**

```bash
npm install next@15 react@19 react-dom@19
npm install -D typescript @types/react @types/react-dom @types/node
```

- [ ] **Step 2: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}
export default nextConfig
```

- [ ] **Step 3: Create `tsconfig.json` (strict)**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Replace `package.json` scripts**

Set the `scripts` block to:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "e2e": "playwright test"
}
```
Remove `"type": "module"` only if present and conflicting; Next handles ESM. Keep `"private": true`.

- [ ] **Step 5: Update `.gitignore`**

Add lines: `.next/`, `/playwright-report/`, `/test-results/`, `next-env.d.ts`. Keep existing entries.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: add Next.js + TypeScript toolchain"
```

### Task A3: Root layout, fonts, global styles, Tailwind for Next

**Files:**
- Create: `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`
- Modify: `postcss.config.js`
- Delete (later, A6): `index.html`, `vite.config.js`, `src/main.jsx`, `src/index.css`, `tailwind.config.js`

- [ ] **Step 1: Create `app/globals.css`** — copy the full contents of `src/index.css` verbatim, then rename the color token: change `bg-base` to `bg-ink` and `text-base` to `text-ink` wherever they appear, and replace `#08080d` usages in `::selection`/scrollbar only if expressed via the token (they are literal hex here, leave them). The `@apply bg-base` on `body` becomes `@apply bg-ink`.

- [ ] **Step 2: Create `tailwind.config.ts`** from `tailwind.config.js`, renaming the `base` color key to `ink`:

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#08080d',
        surface: '#101019',
        surface2: '#171723',
        line: 'rgba(255,255,255,0.08)',
        fog: '#e9e9f2',
        muted: '#9494ad',
        violet: '#7c5cff',
        cyan: '#22d3ee',
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        sans: ['var(--font-manrope)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: { float: 'float 7s ease-in-out infinite' },
    },
  },
  plugins: [],
}
export default config
```

- [ ] **Step 3: Ensure `postcss.config.js` targets Tailwind**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

- [ ] **Step 4: Create `app/layout.tsx`** with fonts via `next/font` and metadata ported from `index.html`:

```tsx
import type { Metadata } from 'next'
import { Sora, Manrope } from 'next/font/google'
import './globals.css'

const sora = Sora({ subsets: ['latin'], weight: ['400','500','600','700','800'], variable: '--font-sora' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: 'Cadence — Automation that runs your busywork',
  description:
    'Cadence turns repetitive team workflows into automations that run themselves. Connect your stack, set the rules, and let it work.',
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='24' fill='%237c5cff'/%3E%3Cpath d='M30 62 L46 38 L54 54 L70 32' stroke='white' stroke-width='8' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: Next.js root layout, fonts, globals, tailwind config"
```

### Task A4: Port marketing components

**Files:**
- Create: `components/marketing/{Nav,Hero,Logos,Features,Pricing,CTA,Footer,Counter}.tsx`

- [ ] **Step 1: Copy each `src/components/*.jsx` to `components/marketing/*.tsx`** preserving code, then apply these exact transformations to every file:
  - Add `'use client'` as the first line in: `Nav.tsx`, `Hero.tsx`, `Features.tsx`, `Pricing.tsx`, `Counter.tsx` (they use state/effects/Framer Motion). `Logos.tsx`, `CTA.tsx`, `Footer.tsx` are server-safe but `CTA.tsx`/`Footer.tsx` import Framer Motion → also add `'use client'` to `CTA.tsx`. `Footer.tsx` and `Logos.tsx` have no client APIs → leave as server components.
  - Replace every `text-base` → `text-ink` and `bg-base` → `bg-ink` and `from-base`/`to-base` → `from-ink`/`to-ink`.
  - Update relative import in `Features.tsx`: `import Counter from './Counter'` stays (same dir).
  - Add minimal prop types where components take props: `Counter` →
    ```tsx
    export default function Counter({ to, suffix = '', decimals = 0, duration = 1400 }:
      { to: number; suffix?: string; decimals?: number; duration?: number }) {
    ```
    and in `Features.tsx`, type the helpers:
    ```tsx
    function Card({ icon: Icon, title, desc }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; title: string; desc: string }) { ... }
    function Stat({ value, label }: { value: React.ReactNode; label: string }) { ... }
    ```

- [ ] **Step 2: Typecheck the ported components**

Run: `npm run typecheck`
Expected: exit 0 (no errors from `components/marketing`). Fix any `any`/implicit-any flagged.

- [ ] **Step 3: Commit**

```bash
git add components/marketing && git commit -m "feat: port marketing components to Next.js + TypeScript"
```

### Task A5: Marketing page route

**Files:**
- Create: `app/(marketing)/page.tsx`

- [ ] **Step 1: Create the page composing the ported components (mirrors old `App.jsx`)**

```tsx
import Nav from '@/components/marketing/Nav'
import Hero from '@/components/marketing/Hero'
import Logos from '@/components/marketing/Logos'
import Features from '@/components/marketing/Features'
import Pricing from '@/components/marketing/Pricing'
import CTA from '@/components/marketing/CTA'
import Footer from '@/components/marketing/Footer'

export default function MarketingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Nav />
      <main>
        <Hero />
        <Logos />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 2: Run dev server and verify visual parity**

Run: `npm run dev`, open `http://localhost:3000`.
Expected: page renders identically to the old Vite site — hero animation, logos, bento features with animated counters, pricing toggle recalculating prices, CTA, footer. Confirm the pricing monthly/annual toggle changes prices and the stat counters animate on scroll.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: exit 0, `/` route listed as static.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: marketing page route at /"
```

### Task A6: Remove Vite scaffolding

**Files:**
- Delete: `index.html`, `vite.config.js`, `postcss.config.js` (old, if replaced separately keep the new one), `src/` (entire dir), `tailwind.config.js`, `src/index.css`

- [ ] **Step 1: Delete obsolete Vite files**

```bash
git rm -r src index.html vite.config.js tailwind.config.js
```
(Keep the new `tailwind.config.ts`, `postcss.config.js`, `app/`, `components/`.)

- [ ] **Step 2: Remove unused deps**

```bash
npm uninstall @vitejs/plugin-react vite
```

- [ ] **Step 3: Verify build still works**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove Vite scaffolding"
```

---

## Milestone B — Tooling, env, test harness, CI

### Task B1: ESLint (with jsx-a11y) + Prettier

**Files:**
- Create: `.eslintrc.cjs`, `.prettierrc`, `.prettierignore`

- [ ] **Step 1: Install**

```bash
npm install -D eslint eslint-config-next eslint-plugin-jsx-a11y prettier
```

- [ ] **Step 2: Create `.eslintrc.cjs`**

```js
module.exports = {
  extends: ['next/core-web-vitals', 'plugin:jsx-a11y/recommended'],
  plugins: ['jsx-a11y'],
}
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```

- [ ] **Step 4: Create `.prettierignore`** with: `.next`, `node_modules`, `prisma/migrations`.

- [ ] **Step 5: Run lint and fix**

Run: `npm run lint`
Expected: exit 0 (fix any a11y issues surfaced in marketing components — e.g. add `aria-label` if flagged).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: eslint (jsx-a11y) + prettier"
```

### Task B2: zod-validated env

**Files:**
- Create: `lib/env.ts`, `.env.example`

- [ ] **Step 1: Install zod**

```bash
npm install zod
```

- [ ] **Step 2: Create `lib/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Cadence <onboarding@resend.dev>'),
  APP_URL: z.string().url().default('http://localhost:3000'),
})

export const env = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_URL: process.env.APP_URL,
})
```

- [ ] **Step 3: Create `.env.example`**

```bash
# Postgres (Neon). Local dev: a local Postgres URL also works.
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
# Auth.js — generate with: npx auth secret
AUTH_SECRET=""
# Google OAuth (optional locally; required for "Sign in with Google")
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
# Resend (optional in dev — links are logged to the console when unset)
RESEND_API_KEY=""
EMAIL_FROM="Cadence <onboarding@resend.dev>"
APP_URL="http://localhost:3000"
```

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts .env.example && git commit -m "feat: zod-validated env + .env.example"
```

### Task B3: Vitest + React Testing Library harness

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/slug.ts`, `lib/slug.test.ts`

- [ ] **Step 1: Install**

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', setupFiles: ['./vitest.setup.ts'], globals: true },
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
})
```

- [ ] **Step 3: Create `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Write the failing test `lib/slug.test.ts`** (first real TDD unit)

```ts
import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Acme Corp')).toBe('acme-corp')
  })
  it('strips non-alphanumerics and collapses dashes', () => {
    expect(slugify('  Hello,   World!! ')).toBe('hello-world')
  })
  it('appends a short suffix when asked for uniqueness', () => {
    const s = slugify('Acme', { withSuffix: true })
    expect(s).toMatch(/^acme-[a-z0-9]{4,6}$/)
  })
})
```

- [ ] **Step 5: Run it — verify it fails**

Run: `npm test -- slug`
Expected: FAIL — `slugify` not found.

- [ ] **Step 6: Implement `lib/slug.ts`**

```ts
export function slugify(input: string, opts: { withSuffix?: boolean } = {}): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
  if (!opts.withSuffix) return base
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}
```

- [ ] **Step 7: Run — verify pass**

Run: `npm test -- slug`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "test: vitest harness + slugify util"
```

### Task B4: Playwright harness (config only; spec added in Milestone G)

**Files:**
- Create: `playwright.config.ts`

- [ ] **Step 1: Install**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:3000' },
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Commit**

```bash
git add playwright.config.ts && git commit -m "chore: playwright config"
```

### Task B5: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request:
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: postgresql://postgres:postgres@localhost:5432/cadence
      AUTH_SECRET: ci-secret-ci-secret-ci-secret
      APP_URL: http://localhost:3000
    services:
      postgres:
        image: postgres:16
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: cadence }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma validate
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml && git commit -m "ci: typecheck, lint, test, prisma validate, build"
```

---

## Milestone C — Database & Prisma

### Task C1: Prisma schema + client

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`

- [ ] **Step 1: Install Prisma**

```bash
npm install @prisma/client
npm install -D prisma
```

- [ ] **Step 2: Create `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}

model User {
  id            String       @id @default(cuid())
  name          String?
  email         String       @unique
  emailVerified DateTime?
  image         String?
  passwordHash  String?
  createdAt     DateTime     @default(now())
  accounts      Account[]
  sessions      Session[]
  memberships   Membership[]
  resetTokens   PasswordResetToken[]
  sentInvites   Invitation[] @relation("InvitedBy")
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Workspace {
  id          String       @id @default(cuid())
  name        String
  slug        String       @unique
  createdAt   DateTime     @default(now())
  memberships Membership[]
  invitations Invitation[]
}

model Membership {
  id          String    @id @default(cuid())
  userId      String
  workspaceId String
  role        Role      @default(MEMBER)
  createdAt   DateTime  @default(now())
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@unique([userId, workspaceId])
}

model Invitation {
  id          String    @id @default(cuid())
  workspaceId String
  email       String
  role        Role      @default(MEMBER)
  token       String    @unique
  expiresAt   DateTime
  invitedById String
  acceptedAt  DateTime?
  createdAt   DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  invitedBy   User      @relation("InvitedBy", fields: [invitedById], references: [id])
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

- [ ] **Step 3: Create `lib/db.ts` (singleton)**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: Validate schema and generate client**

Run: `npx prisma validate && npx prisma generate`
Expected: "The schema is valid" + client generated.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: prisma schema (users, workspaces, memberships, invitations, tokens) + client"
```

### Task C2: Create the initial migration

**Files:**
- Create: `prisma/migrations/**`

**Prerequisite:** a reachable Postgres. Locally, set `DATABASE_URL` in `.env` to a local Postgres or a Neon dev branch.

- [ ] **Step 1: Create migration**

Run: `npx prisma migrate dev --name init`
Expected: migration created and applied; tables exist.

- [ ] **Step 2: Verify**

Run: `npx prisma migrate status`
Expected: "Database schema is up to date!"

- [ ] **Step 3: Commit**

```bash
git add prisma/migrations && git commit -m "feat: initial database migration"
```

---

## Milestone D — Auth

### Task D1: Password hashing util (TDD)

**Files:**
- Create: `lib/password.ts`, `lib/password.test.ts`

- [ ] **Step 1: Install bcrypt**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Write failing test `lib/password.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  it('hashes and verifies a correct password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(hash).not.toBe('s3cret-pass')
    expect(await verifyPassword('s3cret-pass', hash)).toBe(true)
  })
  it('rejects a wrong password', async () => {
    const hash = await hashPassword('s3cret-pass')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 3: Run — verify fail**

Run: `npm test -- password`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `lib/password.ts`**

```ts
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 5: Run — verify pass**

Run: `npm test -- password`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: password hashing util (tdd)"
```

### Task D2: Email lib with dev console fallback

**Files:**
- Create: `lib/email.ts`

- [ ] **Step 1: Install Resend**

```bash
npm install resend
```

- [ ] **Step 2: Create `lib/email.ts`**

```ts
import { Resend } from 'resend'
import { env } from './env'

type SendArgs = { to: string; subject: string; html: string }

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Dev fallback: no provider configured — log so links are usable locally.
    console.info(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${html}\n`)
    return
  }
  const resend = new Resend(env.RESEND_API_KEY)
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html })
}

export function actionLinkEmail(title: string, url: string, cta: string): string {
  return `<h2>${title}</h2><p><a href="${url}">${cta}</a></p><p>${url}</p>`
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add lib/email.ts && git commit -m "feat: email lib with dev console fallback"
```

### Task D3: Token util (TDD)

**Files:**
- Create: `lib/tokens.ts`, `lib/tokens.test.ts`

- [ ] **Step 1: Write failing test `lib/tokens.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { generateToken, expiryFromNow } from './tokens'

describe('tokens', () => {
  it('generates a url-safe random token', () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{32,}$/)
    expect(generateToken()).not.toBe(t)
  })
  it('computes a future expiry', () => {
    const exp = expiryFromNow(60)
    expect(exp.getTime()).toBeGreaterThan(Date.now())
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- tokens`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/tokens.ts`**

```ts
import { randomBytes } from 'node:crypto'

export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function expiryFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- tokens`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: token util (tdd)"
```

### Task D4: Workspace provisioning helper (TDD with mocked db)

**Files:**
- Create: `lib/workspace.ts`, `lib/workspace.test.ts`

- [ ] **Step 1: Write failing test `lib/workspace.test.ts`** (verifies a unique slug is chosen and OWNER membership created)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPersonalWorkspace } from './workspace'

const db = {
  workspace: { findUnique: vi.fn(), create: vi.fn() },
  membership: { create: vi.fn() },
}
vi.mock('./db', () => ({ db }))

beforeEach(() => {
  db.workspace.findUnique.mockReset()
  db.workspace.create.mockReset()
  db.membership.create.mockReset()
})

describe('createPersonalWorkspace', () => {
  it('creates a workspace with a free slug and an OWNER membership', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    db.workspace.create.mockResolvedValue({ id: 'w1', name: "Ada's workspace", slug: 'ada-s-workspace' })
    db.membership.create.mockResolvedValue({ id: 'm1' })

    const ws = await createPersonalWorkspace({ userId: 'u1', name: 'Ada' })

    expect(ws.id).toBe('w1')
    expect(db.workspace.create).toHaveBeenCalledOnce()
    expect(db.membership.create).toHaveBeenCalledWith({
      data: { userId: 'u1', workspaceId: 'w1', role: 'OWNER' },
    })
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- workspace`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/workspace.ts`**

```ts
import { db } from './db'
import { slugify } from './slug'

export async function createPersonalWorkspace({ userId, name }: { userId: string; name: string }) {
  const display = `${name}'s workspace`
  let slug = slugify(display)
  while (await db.workspace.findUnique({ where: { slug } })) {
    slug = slugify(display, { withSuffix: true })
  }
  const workspace = await db.workspace.create({ data: { name: display, slug } })
  await db.membership.create({ data: { userId, workspaceId: workspace.id, role: 'OWNER' } })
  return workspace
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- workspace`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: personal workspace provisioning (tdd)"
```

### Task D5: Auth.js config (Credentials + Google, JWT sessions)

**Files:**
- Create: `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Install Auth.js + adapter**

```bash
npm install next-auth@beta @auth/prisma-adapter
```

- [ ] **Step 2: Create `lib/auth.ts`**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'
import { verifyPassword } from './password'
import { createPersonalWorkspace } from './workspace'
import { env } from './env'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = String(creds?.email ?? '').toLowerCase()
        const password = String(creds?.password ?? '')
        if (!email || !password) return null
        const user = await db.user.findUnique({ where: { email } })
        if (!user?.passwordHash) return null
        if (!(await verifyPassword(password, user.passwordHash))) return null
        return { id: user.id, email: user.email, name: user.name, image: user.image }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id
      return token
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string
      return session
    },
  },
  events: {
    // Google sign-in creates the User via the adapter; ensure it has a workspace.
    async createUser({ user }) {
      if (user.id) await createPersonalWorkspace({ userId: user.id, name: user.name ?? 'My' })
    },
  },
})
```

- [ ] **Step 3: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 4: Add session typing — create `types/next-auth.d.ts`**

```ts
import 'next-auth'
declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user']
  }
}
import type { DefaultSession } from 'next-auth'
```

- [ ] **Step 5: Generate an AUTH_SECRET and set local env**

Run: `npx auth secret` (writes `AUTH_SECRET` to `.env.local`). Ensure `.env`/`.env.local` has `DATABASE_URL` too.

- [ ] **Step 6: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: auth.js config (credentials + google, jwt sessions)"
```

### Task D6: Signup API route

**Files:**
- Create: `app/api/signup/route.ts`

- [ ] **Step 1: Create `app/api/signup/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createPersonalWorkspace } from '@/lib/workspace'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { name, email: rawEmail, password } = parsed.data
  const email = rawEmail.toLowerCase()

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
  }

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  })
  await createPersonalWorkspace({ userId: user.id, name })

  // Soft email verification: send a verify link but do not block login.
  const token = generateToken()
  await db.verificationToken.create({
    data: { identifier: email, token, expires: expiryFromNow(60 * 24) },
  })
  const url = `${env.APP_URL}/verify-email?token=${token}&email=${encodeURIComponent(email)}`
  await sendEmail({
    to: email,
    subject: 'Verify your Cadence email',
    html: actionLinkEmail('Confirm your email', url, 'Verify email'),
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: signup api (create user + workspace + verify email)"
```

### Task D7: Email verification route + password reset routes

**Files:**
- Create: `app/api/password-reset/request/route.ts`, `app/api/password-reset/confirm/route.ts`
- Create: `app/(auth)/verify-email/page.tsx`

- [ ] **Step 1: Create verify-email page `app/(auth)/verify-email/page.tsx`** (server component that consumes the token)

```tsx
import { db } from '@/lib/db'

export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>
}) {
  const { token, email } = await searchParams
  let ok = false
  if (token && email) {
    const row = await db.verificationToken.findUnique({ where: { token } })
    if (row && row.identifier === email && row.expires > new Date()) {
      await db.user.update({ where: { email }, data: { emailVerified: new Date() } })
      await db.verificationToken.delete({ where: { token } })
      ok = true
    }
  }
  return (
    <main className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">
        {ok ? 'Email verified' : 'Invalid or expired link'}
      </h1>
      <a href="/app" className="mt-6 inline-block text-cyan">Go to Cadence →</a>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/api/password-reset/request/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'

const Body = z.object({ email: z.string().email() })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const email = parsed.data.email.toLowerCase()
  const user = await db.user.findUnique({ where: { email } })
  // Always respond 200 to avoid leaking which emails exist.
  if (user) {
    const token = generateToken()
    await db.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt: expiryFromNow(60) },
    })
    const url = `${env.APP_URL}/reset-password?token=${token}`
    await sendEmail({
      to: email,
      subject: 'Reset your Cadence password',
      html: actionLinkEmail('Reset your password', url, 'Choose a new password'),
    })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create `app/api/password-reset/confirm/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

const Body = z.object({ token: z.string().min(10), password: z.string().min(8).max(200) })

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const { token, password } = parsed.data
  const row = await db.passwordResetToken.findUnique({ where: { token } })
  if (!row || row.expiresAt < new Date()) {
    return NextResponse.json({ error: 'This reset link is invalid or expired.' }, { status: 400 })
  }
  await db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(password) } })
  await db.passwordResetToken.delete({ where: { token } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: email verification + password reset flows"
```

### Task D8: Route protection middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Create `middleware.ts`**

```ts
import { auth } from '@/lib/auth'

export default auth((req) => {
  const isApp = req.nextUrl.pathname.startsWith('/app')
  if (isApp && !req.auth) {
    const url = new URL('/login', req.nextUrl)
    url.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return Response.redirect(url)
  }
})

export const config = { matcher: ['/app/:path*'] }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts && git commit -m "feat: middleware guards /app routes"
```

---

## Milestone E — RBAC & auth UI

### Task E1: RBAC helper (TDD)

**Files:**
- Create: `lib/rbac.ts`, `lib/rbac.test.ts`

- [ ] **Step 1: Write failing test `lib/rbac.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasRequiredRole, RbacError, requireWorkspaceRole } from './rbac'

const db = { membership: { findUnique: vi.fn() } }
vi.mock('./db', () => ({ db }))
beforeEach(() => db.membership.findUnique.mockReset())

describe('hasRequiredRole', () => {
  it('OWNER satisfies an ADMIN requirement', () => {
    expect(hasRequiredRole('OWNER', 'ADMIN')).toBe(true)
  })
  it('MEMBER does not satisfy ADMIN', () => {
    expect(hasRequiredRole('MEMBER', 'ADMIN')).toBe(false)
  })
})

describe('requireWorkspaceRole', () => {
  it('throws RbacError when the user is not a member', async () => {
    db.membership.findUnique.mockResolvedValue(null)
    await expect(requireWorkspaceRole('u1', 'w1', 'MEMBER')).rejects.toBeInstanceOf(RbacError)
  })
  it('returns the membership when the role is sufficient', async () => {
    db.membership.findUnique.mockResolvedValue({ id: 'm1', role: 'ADMIN' })
    const m = await requireWorkspaceRole('u1', 'w1', 'ADMIN')
    expect(m.role).toBe('ADMIN')
  })
})
```

- [ ] **Step 2: Run — verify fail**

Run: `npm test -- rbac`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/rbac.ts`**

```ts
import { db } from './db'
import type { Role } from '@prisma/client'

const RANK: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 }

export class RbacError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'RbacError'
  }
}

export function hasRequiredRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required]
}

export async function requireWorkspaceRole(userId: string, workspaceId: string, required: Role) {
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  if (!membership || !hasRequiredRole(membership.role, required)) {
    throw new RbacError()
  }
  return membership
}
```

- [ ] **Step 4: Run — verify pass**

Run: `npm test -- rbac`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: workspace rbac helper (tdd)"
```

### Task E2: Shared UI primitives

**Files:**
- Create: `components/ui/Button.tsx`, `Input.tsx`, `Label.tsx`, `FormError.tsx`

- [ ] **Step 1: Create the four primitives**

`components/ui/Button.tsx`:
```tsx
import { clsx } from 'clsx'
type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }
export function Button({ className, variant = 'primary', ...props }: Props) {
  return (
    <button
      className={clsx(
        'rounded-full px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] disabled:opacity-60',
        variant === 'primary' ? 'bg-gradient-to-r from-violet to-cyan text-ink' : 'border border-line text-fog hover:bg-white/5',
        className,
      )}
      {...props}
    />
  )
}
```

`components/ui/Label.tsx`:
```tsx
export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1.5 block text-sm font-medium text-fog" {...props} />
}
```

`components/ui/Input.tsx`:
```tsx
import { clsx } from 'clsx'
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog outline-none focus-visible:border-violet',
        className,
      )}
      {...props}
    />
  )
}
```

`components/ui/FormError.tsx`:
```tsx
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null
  return <p role="alert" className="text-sm text-red-400">{children}</p>
}
```

- [ ] **Step 2: Install clsx**

```bash
npm install clsx
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: shared ui primitives"
```

### Task E3: Login / signup / forgot / reset pages

**Files:**
- Create: `app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`, `reset-password/page.tsx`
- Create: `components/auth/AuthCard.tsx`

- [ ] **Step 1: Create `components/auth/AuthCard.tsx`** (shared shell)

```tsx
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-bold">{title}</h1>
      {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
      <div className="mt-8">{children}</div>
    </main>
  )
}
```

- [ ] **Step 2: Create `app/(auth)/signup/page.tsx`** (client form → `/api/signup` then `signIn`)

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

export default function SignupPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const body = {
      name: String(form.get('name')),
      email: String(form.get('email')),
      password: String(form.get('password')),
    }
    const res = await fetch('/api/signup', { method: 'POST', body: JSON.stringify(body) })
    if (!res.ok) {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    await signIn('credentials', { email: body.email, password: body.password, callbackUrl: '/app' })
  }

  return (
    <AuthCard title="Create your account" subtitle="Start automating in minutes.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
        <FormError>{error}</FormError>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Creating…' : 'Create account'}</Button>
      </form>
      <button onClick={() => signIn('google', { callbackUrl: '/app' })} className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-semibold hover:bg-white/5">
        Continue with Google
      </button>
      <p className="mt-6 text-sm text-muted">Already have an account? <a href="/login" className="text-cyan">Log in</a></p>
    </AuthCard>
  )
}
```

- [ ] **Step 3: Create `app/(auth)/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await signIn('credentials', {
      email: String(form.get('email')),
      password: String(form.get('password')),
      redirect: false,
    })
    if (res?.error) { setError('Invalid email or password.'); setLoading(false); return }
    window.location.href = '/app'
  }

  return (
    <AuthCard title="Welcome back">
      <form onSubmit={onSubmit} className="space-y-4">
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" required /></div>
        <FormError>{error}</FormError>
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <button onClick={() => signIn('google', { callbackUrl: '/app' })} className="mt-3 w-full rounded-full border border-line py-2.5 text-sm font-semibold hover:bg-white/5">
        Continue with Google
      </button>
      <p className="mt-6 text-sm text-muted"><a href="/forgot-password" className="text-cyan">Forgot password?</a> · No account? <a href="/signup" className="text-cyan">Sign up</a></p>
    </AuthCard>
  )
}
```

- [ ] **Step 4: Create `app/(auth)/forgot-password/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const email = String(new FormData(e.currentTarget).get('email'))
    await fetch('/api/password-reset/request', { method: 'POST', body: JSON.stringify({ email }) })
    setSent(true)
  }
  return (
    <AuthCard title="Reset your password" subtitle="We'll email you a reset link.">
      {sent ? (
        <p className="text-muted">If that email exists, a reset link is on its way.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required /></div>
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthCard>
  )
}
```

- [ ] **Step 5: Create `app/(auth)/reset-password/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { FormError } from '@/components/ui/FormError'

export default function ResetPasswordPage() {
  const token = useSearchParams().get('token') ?? ''
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const password = String(new FormData(e.currentTarget).get('password'))
    const res = await fetch('/api/password-reset/confirm', { method: 'POST', body: JSON.stringify({ token, password }) })
    if (!res.ok) { const j = await res.json().catch(() => ({})); setError(j.error ?? 'Failed.'); return }
    setDone(true)
  }
  return (
    <AuthCard title="Choose a new password">
      {done ? (
        <p className="text-muted">Password updated. <a href="/login" className="text-cyan">Log in →</a></p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div><Label htmlFor="password">New password</Label><Input id="password" name="password" type="password" minLength={8} required /></div>
          <FormError>{error}</FormError>
          <Button type="submit" className="w-full">Update password</Button>
        </form>
      )}
    </AuthCard>
  )
}
```

- [ ] **Step 6: Wrap app with SessionProvider — create `app/(auth)/layout.tsx` is not needed; instead create `components/Providers.tsx`**

```tsx
'use client'
import { SessionProvider } from 'next-auth/react'
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```
Then wrap `{children}` in `app/layout.tsx`'s `<body>` with `<Providers>...</Providers>` (import it).

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: auth pages (login, signup, forgot/reset) + session provider"
```

---

## Milestone F — App shell & settings

### Task F1: Workspace context helpers

**Files:**
- Create: `lib/session.ts`

- [ ] **Step 1: Create `lib/session.ts`** — resolves the current user + active workspace (cookie `ws`, default to first membership)

```ts
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from './db'

export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

export async function getActiveWorkspace(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null
  const cookieStore = await cookies()
  const preferred = cookieStore.get('ws')?.value
  const chosen = memberships.find((m) => m.workspaceId === preferred) ?? memberships[0]
  return { workspace: chosen.workspace, role: chosen.role, all: memberships }
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/session.ts && git commit -m "feat: session/workspace resolution helpers"
```

### Task F2: App layout (sidebar, topbar, switcher, user menu, verify banner)

**Files:**
- Create: `app/(app)/app/layout.tsx`
- Create: `components/app/Sidebar.tsx`, `Topbar.tsx`, `WorkspaceSwitcher.tsx`, `UserMenu.tsx`, `VerifyBanner.tsx`
- Create: `app/api/workspace/switch/route.ts`

- [ ] **Step 1: Create `app/api/workspace/switch/route.ts`** (sets the `ws` cookie)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole } from '@/lib/rbac'

const Body = z.object({ workspaceId: z.string() })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  await requireWorkspaceRole(user.id, parsed.data.workspaceId, 'MEMBER')
  const res = NextResponse.json({ ok: true })
  res.cookies.set('ws', parsed.data.workspaceId, { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
```

- [ ] **Step 2: Create `components/app/Sidebar.tsx`** (server-safe nav with placeholders)

```tsx
import Link from 'next/link'
import { Workflow, PlayCircle, Plug, Settings } from 'lucide-react'

const items = [
  { href: '/app', label: 'Workflows', icon: Workflow },
  { href: '/app/runs', label: 'Runs', icon: PlayCircle },
  { href: '/app/connections', label: 'Connections', icon: Plug },
  { href: '/app/settings/profile', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line p-4 md:block">
      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-fog">
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 3: Create `components/app/WorkspaceSwitcher.tsx`** (client; posts to switch route)

```tsx
'use client'
type Item = { workspaceId: string; workspace: { id: string; name: string } }
export function WorkspaceSwitcher({ items, current }: { items: Item[]; current: string }) {
  async function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    await fetch('/api/workspace/switch', { method: 'POST', body: JSON.stringify({ workspaceId: e.target.value }) })
    window.location.reload()
  }
  return (
    <select aria-label="Switch workspace" value={current} onChange={onChange}
      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm">
      {items.map((m) => <option key={m.workspaceId} value={m.workspaceId}>{m.workspace.name}</option>)}
    </select>
  )
}
```

- [ ] **Step 4: Create `components/app/UserMenu.tsx`** (client; sign out)

```tsx
'use client'
import { signOut } from 'next-auth/react'
export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted">{email}</span>
      <button onClick={() => signOut({ callbackUrl: '/' })} className="rounded-lg border border-line px-3 py-1.5 hover:bg-white/5">Sign out</button>
    </div>
  )
}
```

- [ ] **Step 5: Create `components/app/VerifyBanner.tsx`**

```tsx
export function VerifyBanner() {
  return (
    <div className="border-b border-line bg-violet/10 px-6 py-2 text-center text-sm text-fog">
      Please verify your email to secure your account. Check your inbox for the link.
    </div>
  )
}
```

- [ ] **Step 6: Create `components/app/Topbar.tsx`**

```tsx
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserMenu } from './UserMenu'

type Membership = { workspaceId: string; workspace: { id: string; name: string } }
export function Topbar({ memberships, currentWorkspaceId, email }: { memberships: Membership[]; currentWorkspaceId: string; email: string }) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-3">
      <WorkspaceSwitcher items={memberships} current={currentWorkspaceId} />
      <UserMenu email={email} />
    </header>
  )
}
```

- [ ] **Step 7: Create `app/(app)/app/layout.tsx`** (composes shell, redirects if no workspace)

```tsx
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { Sidebar } from '@/components/app/Sidebar'
import { Topbar } from '@/components/app/Topbar'
import { VerifyBanner } from '@/components/app/VerifyBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { emailVerified: true } })

  return (
    <div className="min-h-screen">
      {!dbUser?.emailVerified && <VerifyBanner />}
      <Topbar
        memberships={active.all.map((m) => ({ workspaceId: m.workspaceId, workspace: { id: m.workspace.id, name: m.workspace.name } }))}
        currentWorkspaceId={active.workspace.id}
        email={user.email ?? ''}
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: authenticated app shell (sidebar, topbar, switcher, verify banner)"
```

### Task F3: Dashboard home + placeholder routes

**Files:**
- Create: `app/(app)/app/page.tsx`, `app/(app)/app/runs/page.tsx`, `app/(app)/app/connections/page.tsx`
- Create: `components/app/EmptyState.tsx`

- [ ] **Step 1: Create `components/app/EmptyState.tsx`**

```tsx
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line p-12 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
    </div>
  )
}
```

- [ ] **Step 2: Create the three pages**

`app/(app)/app/page.tsx`:
```tsx
import { EmptyState } from '@/components/app/EmptyState'
export default function WorkflowsHome() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Workflows</h1>
      <EmptyState title="No workflows yet" body="Workflow building arrives in the next release. Your foundation is ready." />
    </div>
  )
}
```

`app/(app)/app/runs/page.tsx`:
```tsx
import { EmptyState } from '@/components/app/EmptyState'
export default function RunsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Runs</h1>
      <EmptyState title="No runs yet" body="Run history appears here once the execution engine ships." />
    </div>
  )
}
```

`app/(app)/app/connections/page.tsx`:
```tsx
import { EmptyState } from '@/components/app/EmptyState'
export default function ConnectionsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Connections</h1>
      <EmptyState title="No connections yet" body="Connect Slack, email, and HTTP endpoints in an upcoming release." />
    </div>
  )
}
```

- [ ] **Step 3: Build + commit**

Run: `npm run build` (expect exit 0), then:
```bash
git add -A && git commit -m "feat: dashboard home + placeholder routes"
```

### Task F4: Settings — profile & workspace

**Files:**
- Create: `app/(app)/app/settings/profile/page.tsx`, `workspace/page.tsx`, `billing/page.tsx`
- Create: `app/api/settings/profile/route.ts`, `app/api/settings/workspace/route.ts`

- [ ] **Step 1: Create `app/api/settings/profile/route.ts`** (update name)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'

const Body = z.object({ name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create `app/api/settings/workspace/route.ts`** (rename; OWNER/ADMIN only)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { slugify } from '@/lib/slug'

const Body = z.object({ workspaceId: z.string(), name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, parsed.data.workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  let slug = slugify(parsed.data.name)
  while (await db.workspace.findFirst({ where: { slug, NOT: { id: parsed.data.workspaceId } } })) {
    slug = slugify(parsed.data.name, { withSuffix: true })
  }
  await db.workspace.update({ where: { id: parsed.data.workspaceId }, data: { name: parsed.data.name, slug } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create the three settings pages.** Profile and workspace are client forms posting to the routes above; billing is a static placeholder.

`app/(app)/app/settings/profile/page.tsx`:
```tsx
import { requireUser } from '@/lib/session'
import { db } from '@/lib/db'
import { ProfileForm } from './ProfileForm'

export default async function ProfileSettings() {
  const user = await requireUser()
  const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } })
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold">Profile</h1>
      <ProfileForm name={dbUser?.name ?? ''} email={dbUser?.email ?? ''} />
    </div>
  )
}
```

`app/(app)/app/settings/profile/ProfileForm.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [saved, setSaved] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get('name'))
    await fetch('/api/settings/profile', { method: 'POST', body: JSON.stringify({ name: value }) })
    setSaved(true)
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><Label htmlFor="email">Email</Label><Input id="email" value={email} disabled /></div>
      <div><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={name} required /></div>
      <Button type="submit">Save</Button>
      {saved && <span className="ml-3 text-sm text-cyan">Saved</span>}
    </form>
  )
}
```

`app/(app)/app/settings/workspace/page.tsx`:
```tsx
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { redirect } from 'next/navigation'
import { WorkspaceForm } from './WorkspaceForm'

export default async function WorkspaceSettings() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold">Workspace</h1>
      <WorkspaceForm workspaceId={active.workspace.id} name={active.workspace.name} canEdit={active.role !== 'MEMBER'} />
    </div>
  )
}
```

`app/(app)/app/settings/workspace/WorkspaceForm.tsx`:
```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

export function WorkspaceForm({ workspaceId, name, canEdit }: { workspaceId: string; name: string; canEdit: boolean }) {
  const [saved, setSaved] = useState(false)
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get('name'))
    await fetch('/api/settings/workspace', { method: 'POST', body: JSON.stringify({ workspaceId, name: value }) })
    setSaved(true)
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div><Label htmlFor="wsname">Workspace name</Label><Input id="wsname" name="name" defaultValue={name} disabled={!canEdit} required /></div>
      {canEdit ? <Button type="submit">Save</Button> : <p className="text-sm text-muted">Only owners and admins can edit the workspace.</p>}
      {saved && <span className="ml-3 text-sm text-cyan">Saved</span>}
    </form>
  )
}
```

`app/(app)/app/settings/billing/page.tsx`:
```tsx
export default function BillingSettings() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold">Billing</h1>
      <p className="text-muted">Billing arrives in a later release. You're on the free plan.</p>
    </div>
  )
}
```

- [ ] **Step 4: Build + commit**

Run: `npm run build` (expect exit 0), then:
```bash
git add -A && git commit -m "feat: settings — profile, workspace, billing placeholder"
```

### Task F5: Settings — members (list, invite, role change, remove)

**Files:**
- Create: `app/(app)/app/settings/members/page.tsx`, `MembersClient.tsx`
- Create: `app/api/invitations/route.ts`, `app/api/invitations/accept/route.ts`
- Create: `app/api/members/route.ts` (role change + remove)

- [ ] **Step 1: Create `app/api/invitations/route.ts`** (create invite; ADMIN+)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { generateToken, expiryFromNow } from '@/lib/tokens'
import { sendEmail, actionLinkEmail } from '@/lib/email'
import { env } from '@/lib/env'

const Body = z.object({
  workspaceId: z.string(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER']),
})

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const { workspaceId, email, role } = parsed.data
  try {
    await requireWorkspaceRole(user.id, workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const token = generateToken()
  await db.invitation.create({
    data: { workspaceId, email: email.toLowerCase(), role, token, expiresAt: expiryFromNow(60 * 24 * 7), invitedById: user.id },
  })
  const url = `${env.APP_URL}/api/invitations/accept?token=${token}`
  await sendEmail({
    to: email,
    subject: 'You have been invited to a Cadence workspace',
    html: actionLinkEmail('Join the workspace', url, 'Accept invitation'),
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}
```

- [ ] **Step 2: Create `app/api/invitations/accept/route.ts`** (GET link; requires login)

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') ?? ''
  const session = await auth()
  if (!session?.user?.id) return NextResponse.redirect(new URL('/login', req.url))

  const invite = await db.invitation.findUnique({ where: { token } })
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return NextResponse.redirect(new URL('/app?invite=invalid', req.url))
  }
  await db.membership.upsert({
    where: { userId_workspaceId: { userId: session.user.id, workspaceId: invite.workspaceId } },
    update: { role: invite.role },
    create: { userId: session.user.id, workspaceId: invite.workspaceId, role: invite.role },
  })
  await db.invitation.update({ where: { token }, data: { acceptedAt: new Date() } })
  const res = NextResponse.redirect(new URL('/app', req.url))
  res.cookies.set('ws', invite.workspaceId, { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
```

- [ ] **Step 3: Create `app/api/members/route.ts`** (change role / remove; OWNER/ADMIN, with owner-protection)

```ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'

const Body = z.object({
  workspaceId: z.string(),
  membershipId: z.string(),
  action: z.enum(['setRole', 'remove']),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
})

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const { workspaceId, membershipId, action, role } = parsed.data
  try {
    await requireWorkspaceRole(user.id, workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const target = await db.membership.findUnique({ where: { id: membershipId } })
  if (!target || target.workspaceId !== workspaceId) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (target.role === 'OWNER') return NextResponse.json({ error: 'Cannot modify the owner.' }, { status: 400 })

  if (action === 'remove') {
    await db.membership.delete({ where: { id: membershipId } })
  } else {
    await db.membership.update({ where: { id: membershipId }, data: { role: role ?? 'MEMBER' } })
  }
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Create `app/(app)/app/settings/members/page.tsx`**

```tsx
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { MembersClient } from './MembersClient'

export default async function MembersSettings() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const members = await db.membership.findMany({
    where: { workspaceId: active.workspace.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const canManage = active.role !== 'MEMBER'
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Members</h1>
      <MembersClient
        workspaceId={active.workspace.id}
        canManage={canManage}
        members={members.map((m) => ({ id: m.id, role: m.role, email: m.user.email, name: m.user.name ?? '' }))}
      />
    </div>
  )
}
```

- [ ] **Step 5: Create `app/(app)/app/settings/members/MembersClient.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Member = { id: string; role: 'OWNER' | 'ADMIN' | 'MEMBER'; email: string; name: string }

export function MembersClient({ workspaceId, canManage, members }: { workspaceId: string; canManage: boolean; members: Member[] }) {
  const [msg, setMsg] = useState('')

  async function invite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/invitations', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, email: String(form.get('email')), role: String(form.get('role')) }),
    })
    setMsg(res.ok ? 'Invitation sent.' : 'Could not send invitation.')
  }

  async function act(membershipId: string, action: 'setRole' | 'remove', role?: string) {
    await fetch('/api/members', { method: 'POST', body: JSON.stringify({ workspaceId, membershipId, action, role }) })
    window.location.reload()
  }

  return (
    <div className="space-y-8">
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>{m.name || m.email} <span className="text-muted">· {m.email}</span></span>
            <span className="flex items-center gap-3">
              <span className="text-muted">{m.role}</span>
              {canManage && m.role !== 'OWNER' && (
                <>
                  <button onClick={() => act(m.id, 'setRole', m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="text-cyan">
                    Make {m.role === 'ADMIN' ? 'member' : 'admin'}
                  </button>
                  <button onClick={() => act(m.id, 'remove')} className="text-red-400">Remove</button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>

      {canManage && (
        <form onSubmit={invite} className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Invite by email</label>
            <Input id="email" name="email" type="email" required />
          </div>
          <select name="role" aria-label="Invite role" defaultValue="MEMBER" className="rounded-lg border border-line bg-surface px-3 py-2.5 text-sm">
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </select>
          <Button type="submit">Invite</Button>
        </form>
      )}
      {msg && <p className="text-sm text-cyan">{msg}</p>}
    </div>
  )
}
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: settings members — invite, role change, remove"
```

---

## Milestone G — A11y polish, E2E, docs, final verification

### Task G1: Accessibility hardening (focus-visible, reduced motion, skip link)

**Files:**
- Modify: `app/globals.css`, `components/marketing/Counter.tsx`, `components/marketing/Pricing.tsx`, `app/layout.tsx`

- [ ] **Step 1: Add focus + reduced-motion CSS to `app/globals.css`**

Append:
```css
:focus-visible { outline: 2px solid #7c5cff; outline-offset: 2px; border-radius: 4px; }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
}
.skip-link {
  position: absolute; left: -999px; top: 0; z-index: 100;
  background: #7c5cff; color: #08080d; padding: 8px 16px; border-radius: 0 0 8px 0;
}
.skip-link:focus { left: 0; }
```
Also move `scroll-behavior: smooth` so it only applies with motion: change the existing `html { scroll-behavior: smooth }` to live inside `@media (prefers-reduced-motion: no-preference)`.

- [ ] **Step 2: Wrap app in MotionConfig + add skip link in `app/layout.tsx`**

Install nothing new. In `app/layout.tsx`, import `MotionConfig` from `framer-motion` is client-only — instead add reduced-motion handling in `Counter.tsx` (Step 3) and a global skip link. Add inside `<body>` before `<Providers>`:
```tsx
<a href="#main" className="skip-link">Skip to content</a>
```
And ensure the marketing `<main>` and app `<main>` have `id="main"` (add `id="main"` to the `<main>` in `app/(marketing)/page.tsx` and `app/(app)/app/layout.tsx`).

- [ ] **Step 3: Respect reduced motion in `Counter.tsx`** — before starting the rAF loop, short-circuit:

Add at the top of the `IntersectionObserver` intersecting branch:
```tsx
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  setVal(to)
  started.current = true
  return
}
```

- [ ] **Step 4: Add `aria-pressed` to the Pricing toggle buttons in `Pricing.tsx`** — on the Monthly button add `aria-pressed={!annual}`, on the Annual button add `aria-pressed={annual}`.

- [ ] **Step 5: Lint + build**

Run: `npm run lint && npm run build`
Expected: exit 0, no a11y warnings.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: a11y — focus-visible, reduced motion, skip link, aria-pressed"
```

### Task G2: E2E happy path (signup → app)

**Files:**
- Create: `e2e/auth.spec.ts`

**Prerequisite:** CI/local Postgres reachable via `DATABASE_URL`; `AUTH_SECRET` set. Email uses the dev console fallback.

- [ ] **Step 1: Create `e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('a new user can sign up and reach the app', async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('E2E User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()

  await page.waitForURL('**/app', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Workflows' })).toBeVisible()
  await expect(page.getByText(/verify your email/i)).toBeVisible()
})

test('the marketing page renders the hero CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /automate the busywork/i })).toBeVisible()
})
```

- [ ] **Step 2: Run E2E**

Run: `npm run e2e`
Expected: 2 passed. (Playwright builds + starts the app via `webServer`.)

- [ ] **Step 3: Add E2E to CI** — append a job step after build in `.github/workflows/ci.yml`:

```yaml
      - run: npx prisma migrate deploy
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: e2e signup happy path + marketing smoke; wire into CI"
```

### Task G3: README + run docs

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite `README.md`** to cover the real app: stack, prerequisites (Node 20, Postgres/Neon), env setup (`cp .env.example .env`, `npx auth secret`, fill `DATABASE_URL`, optional Google/Resend), commands (`npm install`, `npx prisma migrate dev`, `npm run dev`), test commands (`npm test`, `npm run e2e`), and a "Going live" section listing the owner-supplied accounts (Stripe later, Resend, Google OAuth, Neon, Vercel) and the test→live handoff (set `RESEND_API_KEY`, `AUTH_GOOGLE_*`, deploy on Vercel with env vars + `prisma migrate deploy`). Keep the SEIDO attribution line.

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "docs: README for the real app (setup, env, deploy handoff)"
```

### Task G4: Final full verification

- [ ] **Step 1: Run the full gate locally**

Run:
```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```
Expected: all green.

- [ ] **Step 2: Manual smoke (dev server)**

Run `npm run dev` and verify:
- `/` looks identical to the original landing page (animations, pricing toggle, counters).
- Sign up → land on `/app` with verify banner.
- Log out → log in.
- Forgot password → console logs a reset link → reset → log in with new password.
- Settings: rename profile, rename workspace, invite a member (console logs invite link).
- Keyboard-tab through the marketing page: focus ring is visible.
- With OS "reduce motion" on, counters jump to final values and there's no smooth-scroll.

- [ ] **Step 3: Confirm no stray old token names**

Run: `grep -rn "text-base\|bg-base\|from-base\|to-base" app components` (note: this matches the *old* token; `text-ink`/`bg-ink` are correct)
Expected: no matches.

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A && git commit -m "chore: phase 0 final verification cleanup" --allow-empty
```

---

## Self-Review notes (author)

- **Spec coverage:** migration (A) ✓, tooling/CI (B) ✓, DB/Prisma (C) ✓, auth credentials+Google+JWT (D5) ✓, signup/verify/reset (D6–D7) ✓, middleware (D8) ✓, RBAC (E1) ✓, auth UI (E3) ✓, app shell + switcher + verify banner (F2) ✓, settings profile/workspace/members/billing-placeholder (F4–F5) ✓, a11y + `base`→`ink` fix (A3/G1) ✓, testing harness Vitest+Playwright (B3–B4, G2) ✓, README/handoff (G3) ✓, verification (G4) ✓.
- **Resolved open points:** soft email verification (banner, non-blocking) and local-verify-only deploy are encoded throughout.
- **Type consistency:** `requireWorkspaceRole(userId, workspaceId, role)`, `createPersonalWorkspace({userId,name})`, `slugify(input,{withSuffix})`, `hashPassword/verifyPassword`, `generateToken/expiryFromNow`, and the `Role` enum are used consistently across tasks.
- **Deferred to later phases (correctly out of scope):** workflow model/builder (P1), execution engine/connectors (P2), Stripe billing (P3) — billing page is a placeholder here.
