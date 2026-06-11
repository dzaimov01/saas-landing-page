# Cadence Phase 6 Implementation Plan — OAuth, Test, Schedule UX, Analytics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth-based connections (Google Sheets, HubSpot), a per-step "test connection" button, a richer scheduled-trigger config UI, and an analytics dashboard — each degrading gracefully without its optional credentials.

**Architecture:** Pure, unit-tested helpers (`lib/connections/oauth.ts`, `lib/connections/test.ts`, `lib/schedule.ts`, `lib/analytics.ts`) wrapped by thin API routes and client components. OAuth tokens reuse the encrypted `Connection.secret` column (no schema change); the engine resolves tokens through a refresh-aware `getUsableSecret`. Charts via Recharts; cron via cron-parser/cronstrue.

**Tech Stack:** Next.js 15 App Router, Prisma 6, Vitest, Playwright, Recharts, cron-parser, cronstrue.

**Run note:** every Bash command prepends `export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"`.

---

## File Structure

- `lib/connections/oauth.ts` (new) — provider OAuth config + pure URL/exchange/refresh helpers.
- `lib/connections/test.ts` (new) — `testConnection(type, secret)` dispatch.
- `lib/connections/registry.ts` (modify) — add `auth`/`provider`, two oauth types.
- `lib/connections.ts` (modify) — `getUsableSecret`, oauth-aware create skip.
- `lib/connectors/googlesheets.ts`, `lib/connectors/hubspot.ts` (new) + `index.ts` (modify).
- `lib/steps/registry.ts` (modify) — two new step types.
- `lib/engine/execute.ts` (modify) — use `getUsableSecret`.
- `lib/schedule.ts` (new) — presets, describe, nextRun, validateCron.
- `lib/analytics.ts` (new) — `summarizeRuns`.
- `lib/env.ts`, `.env.example`, `README.md`, `docs/DEPLOYMENT.md` (modify) — new env.
- `app/api/connections/oauth/[provider]/start/route.ts`, `.../callback/route.ts` (new).
- `app/api/connections/[id]/test/route.ts` (new).
- `app/(app)/app/connections/page.tsx` + `ConnectionsClient.tsx` (modify) — oauth + test UI.
- `components/builder/ConfigPanel.tsx` (modify) — test button + ScheduleConfig.
- `components/builder/ScheduleConfig.tsx` (new).
- `app/(app)/app/analytics/page.tsx` + `AnalyticsClient.tsx` (new).
- `components/app/Sidebar.tsx` (modify) — Analytics nav.
- Tests: `lib/connections/oauth.test.ts`, `lib/connections/test.test.ts`, `lib/schedule.test.ts`, `lib/analytics.test.ts`, extend `lib/connections.test.ts`, `lib/connectors/connectors.test.ts`; e2e `analytics.spec.ts`, extend `connections.spec.ts`, `workflows.spec.ts`.

---

## Milestone 0: Dependencies

### Task 0: Install deps

- [ ] **Step 1: Install**

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"
npm install recharts cron-parser cronstrue
```

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add recharts, cron-parser, cronstrue for phase 6"
```

---

## Milestone A: Schedule-trigger UX (self-contained, no provider deps)

### Task A1: `lib/schedule.ts` pure helpers

**Files:** Create `lib/schedule.ts`; Test `lib/schedule.test.ts`.

- [ ] **Step 1: Write the failing test** — `lib/schedule.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import {
  SCHEDULE_PRESETS,
  describeSchedule,
  nextRun,
  validateCron,
} from './schedule'

describe('schedule helpers', () => {
  it('exposes presets that map to {mode,value}', () => {
    const hourly = SCHEDULE_PRESETS.find((p) => p.id === 'hourly')!
    expect(hourly.config).toEqual({ mode: 'cron', value: '0 * * * *' })
    expect(SCHEDULE_PRESETS.find((p) => p.id === 'custom')).toBeTruthy()
  })

  it('describes an interval schedule', () => {
    expect(describeSchedule({ mode: 'interval', value: '15' })).toBe('Every 15 minutes')
    expect(describeSchedule({ mode: 'interval', value: '1' })).toBe('Every minute')
  })

  it('describes a cron schedule in words', () => {
    expect(describeSchedule({ mode: 'cron', value: '0 9 * * 1' }).toLowerCase()).toContain('9')
    expect(describeSchedule({ mode: 'cron', value: 'not a cron' })).toBe('Invalid cron expression')
  })

  it('computes next run for an interval', () => {
    const from = new Date('2026-06-11T10:00:00Z')
    expect(nextRun({ mode: 'interval', value: '15' }, from)?.toISOString()).toBe(
      '2026-06-11T10:15:00.000Z',
    )
  })

  it('computes next run for a cron and validates expressions', () => {
    const from = new Date('2026-06-11T10:00:00Z')
    const next = nextRun({ mode: 'cron', value: '0 * * * *' }, from)
    expect(next?.toISOString()).toBe('2026-06-11T11:00:00.000Z')
    expect(validateCron('0 9 * * 1')).toBe(true)
    expect(validateCron('nope')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/schedule.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/schedule.ts`

```ts
import { CronExpressionParser } from 'cron-parser'
import cronstrue from 'cronstrue'

export interface ScheduleValue {
  mode: 'interval' | 'cron'
  value: string
}

export interface SchedulePreset {
  id: string
  label: string
  config: ScheduleValue | null // null = custom
}

export const SCHEDULE_PRESETS: SchedulePreset[] = [
  { id: 'every15', label: 'Every 15 minutes', config: { mode: 'interval', value: '15' } },
  { id: 'hourly', label: 'Every hour', config: { mode: 'cron', value: '0 * * * *' } },
  { id: 'daily9', label: 'Every day at 9:00', config: { mode: 'cron', value: '0 9 * * *' } },
  { id: 'weeklyMon9', label: 'Every Monday at 9:00', config: { mode: 'cron', value: '0 9 * * 1' } },
  { id: 'custom', label: 'Custom…', config: null },
]

export function validateCron(value: string): boolean {
  try {
    CronExpressionParser.parse(value)
    return true
  } catch {
    return false
  }
}

export function describeSchedule({ mode, value }: ScheduleValue): string {
  if (mode === 'interval') {
    const n = Math.max(1, Number(value) || 1)
    return n === 1 ? 'Every minute' : `Every ${n} minutes`
  }
  try {
    return cronstrue.toString(value)
  } catch {
    return 'Invalid cron expression'
  }
}

export function nextRun({ mode, value }: ScheduleValue, from: Date = new Date()): Date | null {
  if (mode === 'interval') {
    const n = Math.max(1, Number(value) || 1)
    return new Date(from.getTime() + n * 60_000)
  }
  try {
    const it = CronExpressionParser.parse(value, { currentDate: from, tz: 'UTC' })
    return it.next().toDate()
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/schedule.test.ts`
Expected: PASS. If `cron-parser`'s export name differs, adjust the import (v5 exports `CronExpressionParser`; older v4 default-exports `parseExpression` — if so use `import parser from 'cron-parser'` and `parser.parseExpression(value, opts)`). Confirm with the installed version.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule.ts lib/schedule.test.ts
git commit -m "feat: schedule presets, human description, next-run preview (tdd)"
```

### Task A2: `ScheduleConfig` component + wire into ConfigPanel

**Files:** Create `components/builder/ScheduleConfig.tsx`; Modify `components/builder/ConfigPanel.tsx`.

- [ ] **Step 1: Implement `ScheduleConfig.tsx`**

```tsx
'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  SCHEDULE_PRESETS,
  describeSchedule,
  nextRun,
  validateCron,
  type ScheduleValue,
} from '@/lib/schedule'

export function ScheduleConfig({
  config,
  canEdit,
  onChange,
}: {
  config: ScheduleValue
  canEdit: boolean
  onChange: (patch: Partial<ScheduleValue>) => void
}) {
  const current: ScheduleValue = { mode: config.mode ?? 'interval', value: config.value ?? '15' }
  const presetId = useMemo(() => {
    const match = SCHEDULE_PRESETS.find(
      (p) => p.config && p.config.mode === current.mode && p.config.value === current.value,
    )
    return match?.id ?? 'custom'
  }, [current.mode, current.value])

  const cronInvalid = current.mode === 'cron' && !validateCron(current.value)
  const next = nextRun(current)

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="schedule-preset">Frequency</Label>
        <select
          id="schedule-preset"
          value={presetId}
          disabled={!canEdit}
          onChange={(e) => {
            const preset = SCHEDULE_PRESETS.find((p) => p.id === e.target.value)
            if (preset?.config) onChange(preset.config)
            else onChange({ mode: 'cron', value: current.value || '0 9 * * *' })
          }}
          className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
        >
          {SCHEDULE_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {presetId === 'custom' && (
        <>
          <div>
            <Label htmlFor="schedule-mode">Mode</Label>
            <select
              id="schedule-mode"
              value={current.mode}
              disabled={!canEdit}
              onChange={(e) => onChange({ mode: e.target.value as ScheduleValue['mode'] })}
              className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
            >
              <option value="interval">Every N minutes</option>
              <option value="cron">Cron expression</option>
            </select>
          </div>
          <div>
            <Label htmlFor="schedule-value">{current.mode === 'cron' ? 'Cron' : 'Minutes'}</Label>
            <Input
              id="schedule-value"
              value={current.value}
              disabled={!canEdit}
              placeholder={current.mode === 'cron' ? '0 9 * * 1' : '15'}
              onChange={(e) => onChange({ value: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="rounded-lg border border-line bg-surface p-3 text-sm">
        {cronInvalid ? (
          <p className="text-red-300">Invalid cron expression</p>
        ) : (
          <>
            <p className="text-fog">{describeSchedule(current)}</p>
            {next && (
              <p className="mt-1 text-xs text-muted">
                Next run: {next.toUTCString()}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire into `ConfigPanel.tsx`** — after the `step.label` header block and the `webhookUrl` block, before the generic `step.fields.map`, special-case schedule. Replace the field-mapping region so that when `node.data.stepType === 'schedule'` it renders `ScheduleConfig` instead of the generic fields.

Add import at top:
```tsx
import { ScheduleConfig } from './ScheduleConfig'
import type { ScheduleValue } from '@/lib/schedule'
```

Wrap the existing `step.fields.map(...)` and its trailing "no configuration" line in a conditional:
```tsx
{node.data.stepType === 'schedule' ? (
  <ScheduleConfig
    config={config as unknown as ScheduleValue}
    canEdit={canEdit}
    onChange={(patch) => onChange(node.id, { config: { ...config, ...patch } })}
  />
) : (
  <>
    {step.fields.map((f) => { /* …existing unchanged… */ })}
    {step.fields.length === 0 && (
      <p className="text-sm text-muted">This step has no configuration.</p>
    )}
  </>
)}
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/builder/ScheduleConfig.tsx components/builder/ConfigPanel.tsx
git commit -m "feat: schedule trigger config UI (presets + description + next-run)"
```

---

## Milestone B: OAuth connections

### Task B1: `lib/connections/oauth.ts` provider config + helpers

**Files:** Create `lib/connections/oauth.ts`; Test `lib/connections/oauth.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

const ENV = process.env

beforeEach(() => {
  process.env = { ...ENV, APP_URL: 'https://app.test', AUTH_SECRET: 'x'.repeat(20) }
})
afterEach(() => {
  process.env = ENV
  vi.unstubAllGlobals()
})

describe('oauth provider helpers', () => {
  it('oauthEnabled reflects client env presence', async () => {
    const { oauthEnabled } = await import('./oauth')
    expect(oauthEnabled('google')).toBe(false)
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'id'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'secret'
    expect(oauthEnabled('google')).toBe(true)
  })

  it('buildAuthorizeUrl includes the required params', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    const { buildAuthorizeUrl } = await import('./oauth')
    const url = new URL(buildAuthorizeUrl('google', 'state123'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.test/api/connections/oauth/google/callback',
    )
    expect(url.searchParams.get('state')).toBe('state123')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('scope')).toContain('spreadsheets')
  })

  it('exchangeCode parses the token response', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
        }),
      }),
    )
    const { exchangeCode } = await import('./oauth')
    const before = Date.now()
    const tok = await exchangeCode('google', 'thecode')
    expect(tok.accessToken).toBe('at')
    expect(tok.refreshToken).toBe('rt')
    expect(Number(tok.expiresAt)).toBeGreaterThanOrEqual(before + 3600_000 - 5000)
  })

  it('refreshAccessToken keeps the old refresh token when none returned', async () => {
    process.env.HUBSPOT_CLIENT_ID = 'cid'
    process.env.HUBSPOT_CLIENT_SECRET = 'sec'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'newAt', expires_in: 1800 }),
      }),
    )
    const { refreshAccessToken } = await import('./oauth')
    const tok = await refreshAccessToken('hubspot', 'origRt')
    expect(tok.accessToken).toBe('newAt')
    expect(tok.refreshToken).toBe('origRt')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/connections/oauth.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement** — `lib/connections/oauth.ts`

```ts
export type OAuthProviderId = 'google' | 'hubspot'

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // epoch millis as string
  scope: string
}

interface OAuthProvider {
  id: OAuthProviderId
  connectionType: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  extraAuthParams?: Record<string, string>
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProvider> = {
  google: {
    id: 'google',
    connectionType: 'google_sheets',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    clientIdEnv: 'GOOGLE_CONNECT_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CONNECT_CLIENT_SECRET',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  hubspot: {
    id: 'hubspot',
    connectionType: 'hubspot',
    authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
  },
}

export function getOAuthProvider(id: string): OAuthProvider {
  const p = OAUTH_PROVIDERS[id as OAuthProviderId]
  if (!p) throw new Error(`Unknown OAuth provider: ${id}`)
  return p
}

function clientId(p: OAuthProvider): string {
  return process.env[p.clientIdEnv] ?? ''
}
function clientSecret(p: OAuthProvider): string {
  return process.env[p.clientSecretEnv] ?? ''
}

export function oauthEnabled(id: string): boolean {
  const p = OAUTH_PROVIDERS[id as OAuthProviderId]
  return !!p && !!clientId(p) && !!clientSecret(p)
}

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:3000'
}

export function redirectUri(id: OAuthProviderId): string {
  return `${appUrl()}/api/connections/oauth/${id}/callback`
}

export function buildAuthorizeUrl(id: OAuthProviderId, state: string): string {
  const p = getOAuthProvider(id)
  const url = new URL(p.authorizeUrl)
  url.searchParams.set('client_id', clientId(p))
  url.searchParams.set('redirect_uri', redirectUri(id))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', p.scopes.join(' '))
  url.searchParams.set('state', state)
  for (const [k, v] of Object.entries(p.extraAuthParams ?? {})) url.searchParams.set(k, v)
  return url.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

function toTokens(json: TokenResponse, fallbackRefresh: string, fallbackScope: string): OAuthTokens {
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? fallbackRefresh,
    expiresAt: String(Date.now() + expiresIn * 1000),
    scope: json.scope ?? fallbackScope,
  }
}

async function postToken(p: OAuthProvider, body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`${p.id} token request failed: ${res.status}`)
  return (await res.json()) as TokenResponse
}

export async function exchangeCode(id: OAuthProviderId, code: string): Promise<OAuthTokens> {
  const p = getOAuthProvider(id)
  const json = await postToken(
    p,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId(p),
      client_secret: clientSecret(p),
      redirect_uri: redirectUri(id),
    }),
  )
  return toTokens(json, '', p.scopes.join(' '))
}

export async function refreshAccessToken(
  id: OAuthProviderId,
  refreshToken: string,
): Promise<OAuthTokens> {
  const p = getOAuthProvider(id)
  const json = await postToken(
    p,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId(p),
      client_secret: clientSecret(p),
    }),
  )
  return toTokens(json, refreshToken, p.scopes.join(' '))
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/connections/oauth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/connections/oauth.ts lib/connections/oauth.test.ts
git commit -m "feat: oauth provider config + authorize/exchange/refresh helpers (tdd)"
```

### Task B2: registry oauth types + env

**Files:** Modify `lib/connections/registry.ts`, `lib/env.ts`, `.env.example`.

- [ ] **Step 1: Extend `ConnectionType`** in `lib/connections/registry.ts`:

```ts
export interface ConnectionType {
  type: string
  label: string
  auth: 'apikey' | 'oauth'
  provider?: string
  fields: ConnectionField[]
}
```

Add `auth: 'apikey'` to each of the six existing entries. Append:

```ts
  google_sheets: {
    type: 'google_sheets',
    label: 'Google Sheets',
    auth: 'oauth',
    provider: 'google',
    fields: [],
  },
  hubspot: {
    type: 'hubspot',
    label: 'HubSpot',
    auth: 'oauth',
    provider: 'hubspot',
    fields: [],
  },
```

- [ ] **Step 2: Add env keys** to `lib/env.ts` schema and `raw` (both blocks):

```ts
  GOOGLE_CONNECT_CLIENT_ID: z.string().optional(),
  GOOGLE_CONNECT_CLIENT_SECRET: z.string().optional(),
  HUBSPOT_CLIENT_ID: z.string().optional(),
  HUBSPOT_CLIENT_SECRET: z.string().optional(),
```
(Add matching `process.env.*` lines in `raw`.)

- [ ] **Step 3: Add to `.env.example`** under Optional:

```bash
# OAuth connections (Google Sheets / HubSpot). Separate from sign-in Google app.
GOOGLE_CONNECT_CLIENT_ID=""
GOOGLE_CONNECT_CLIENT_SECRET=""
HUBSPOT_CLIENT_ID=""
HUBSPOT_CLIENT_SECRET=""
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm test -- lib/connections.test.ts`
Expected: pass (existing connections test still green — note `createConnection` validates only `def.fields`, and apikey types are unaffected).

- [ ] **Step 5: Commit**

```bash
git add lib/connections/registry.ts lib/env.ts .env.example
git commit -m "feat: oauth connection types (google_sheets, hubspot) + env"
```

### Task B3: `getUsableSecret` with refresh

**Files:** Modify `lib/connections.ts`; extend `lib/connections.test.ts`.

- [ ] **Step 1: Write the failing test** — append to `lib/connections.test.ts`. First extend the hoisted db mock to include `connection.update` and `connection.findFirst` (already present). Update the hoisted block:

```ts
const { db } = vi.hoisted(() => ({
  db: { connection: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
}))
```
and reset `db.connection.update.mockReset()` in `beforeEach`. Then add:

```ts
describe('getUsableSecret', () => {
  it('returns apikey secrets unchanged', async () => {
    const { encrypt } = await import('./crypto')
    const { getUsableSecret } = await import('./connections')
    db.connection.findFirst.mockResolvedValue({
      id: 'c1',
      type: 'slack',
      secret: encrypt(JSON.stringify({ webhookUrl: 'https://hooks/x' })),
    })
    expect(await getUsableSecret('c1', 'w')).toEqual({ webhookUrl: 'https://hooks/x' })
    expect(db.connection.update).not.toHaveBeenCalled()
  })

  it('refreshes an expired oauth token and persists it', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    const { encrypt } = await import('./crypto')
    const { getUsableSecret } = await import('./connections')
    db.connection.findFirst.mockResolvedValue({
      id: 'c1',
      type: 'google_sheets',
      secret: encrypt(
        JSON.stringify({ accessToken: 'old', refreshToken: 'rt', expiresAt: '1000', scope: 's' }),
      ),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'fresh', expires_in: 3600 }),
      }),
    )
    const out = await getUsableSecret('c1', 'w')
    expect(out?.accessToken).toBe('fresh')
    expect(db.connection.update).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/connections.test.ts`
Expected: FAIL (`getUsableSecret` not exported).

- [ ] **Step 3: Implement** in `lib/connections.ts`. Modify `createConnection` to skip field validation for oauth types is **not** needed here (manual form never posts oauth types — see route guard), but keep `getConnectionType` usage. Add:

```ts
import { getConnectionType } from './connections/registry'
import { refreshAccessToken, type OAuthProviderId } from './connections/oauth'

// …existing exports…

const REFRESH_SKEW_MS = 60_000

export async function getUsableSecret(
  connectionId: string,
  workspaceId: string,
): Promise<Record<string, string> | null> {
  const conn = await db.connection.findFirst({ where: { id: connectionId, workspaceId } })
  if (!conn) return null
  const secret = JSON.parse(decrypt(conn.secret)) as Record<string, string>

  const def = getConnectionType(conn.type)
  if (def.auth !== 'oauth' || !def.provider) return secret

  const expiresAt = Number(secret.expiresAt ?? 0)
  if (expiresAt - Date.now() > REFRESH_SKEW_MS) return secret

  const tokens = await refreshAccessToken(def.provider as OAuthProviderId, secret.refreshToken ?? '')
  const updated = { ...secret, ...tokens }
  await db.connection.update({
    where: { id: conn.id },
    data: { secret: encrypt(JSON.stringify(updated)) },
  })
  return updated
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/connections.test.ts`
Expected: PASS.

- [ ] **Step 5: Engine uses it** — in `lib/engine/execute.ts` replace the import `getDecryptedSecret` with `getUsableSecret` and the call site:

```ts
const found = await getUsableSecret(String(config.connectionId ?? ''), run.workspaceId)
```

Run: `npm test -- lib/engine/execute.test.ts`
Expected: PASS (the existing execute test mocks connections; if it mocks `getDecryptedSecret` specifically, update the mock to `getUsableSecret`). Inspect and adjust the mock name if needed.

- [ ] **Step 6: Commit**

```bash
git add lib/connections.ts lib/connections.test.ts lib/engine/execute.ts
git commit -m "feat: getUsableSecret refreshes oauth tokens; engine uses it (tdd)"
```

### Task B4: Google Sheets + HubSpot connectors + step types

**Files:** Create `lib/connectors/googlesheets.ts`, `lib/connectors/hubspot.ts`; Modify `lib/connectors/index.ts`, `lib/steps/registry.ts`; extend `lib/connectors/connectors.test.ts`.

- [ ] **Step 1: Write failing tests** — append to `lib/connectors/connectors.test.ts`:

```ts
import { googleSheetsAppend } from './googlesheets'
import { hubspotCreateContact } from './hubspot'

describe('oauth connectors', () => {
  it('google sheets appends a row with a bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await googleSheetsAppend(
      { spreadsheetId: 'sid', range: 'Sheet1!A1', values: 'a,b,c' },
      ctx,
      { accessToken: 'at' },
    )
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/spreadsheets/sid/values/')
    expect(url).toContain(':append')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  it('google sheets throws without a token', async () => {
    await expect(googleSheetsAppend({ spreadsheetId: 's', range: 'A1', values: 'x' }, ctx, undefined)).rejects.toThrow(/token/i)
  })

  it('hubspot creates a contact with properties', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: '1' }) })
    vi.stubGlobal('fetch', fetchMock)
    await hubspotCreateContact({ email: 'a@b.com', firstname: 'A', lastname: 'B' }, ctx, { accessToken: 'at' })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/crm/v3/objects/contacts')
    expect(JSON.parse(init.body as string).properties.email).toBe('a@b.com')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/connectors/connectors.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Implement `lib/connectors/googlesheets.ts`**

```ts
import type { Connector } from './types'

export const googleSheetsAppend: Connector = async (config, _ctx, secret) => {
  const token = secret?.accessToken ?? ''
  if (!token) throw new Error('Google Sheets: no access token (reconnect the connection)')
  const spreadsheetId = String(config.spreadsheetId ?? '')
  const range = String(config.range ?? 'Sheet1!A1')
  const row = String(config.values ?? '')
    .split(',')
    .map((v) => v.trim())
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId,
  )}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [row] }),
  })
  if (!res.ok) throw new Error(`Google Sheets append failed: ${res.status}`)
  return { appended: true }
}
```

- [ ] **Step 4: Implement `lib/connectors/hubspot.ts`**

```ts
import type { Connector } from './types'

export const hubspotCreateContact: Connector = async (config, _ctx, secret) => {
  const token = secret?.accessToken ?? ''
  if (!token) throw new Error('HubSpot: no access token (reconnect the connection)')
  const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: {
        email: String(config.email ?? ''),
        firstname: String(config.firstname ?? ''),
        lastname: String(config.lastname ?? ''),
      },
    }),
  })
  if (!res.ok) throw new Error(`HubSpot create contact failed: ${res.status}`)
  const json = (await res.json()) as { id?: string }
  return { created: true, id: json.id }
}
```

- [ ] **Step 5: Register connectors** in `lib/connectors/index.ts` (import + add to `CONNECTORS`):

```ts
import { googleSheetsAppend } from './googlesheets'
import { hubspotCreateContact } from './hubspot'
// …
  google_sheets_append: googleSheetsAppend,
  hubspot_create_contact: hubspotCreateContact,
```

- [ ] **Step 6: Add step types** in `lib/steps/registry.ts`:

```ts
  google_sheets_append: {
    key: 'google_sheets_append',
    label: 'Google Sheets row',
    kind: 'ACTION',
    description: 'Append a row to a Google Sheet via an OAuth connection.',
    connectionType: 'google_sheets',
    configSchema: z.object({
      connectionId: z.string().min(1),
      spreadsheetId: z.string().min(1),
      range: z.string().min(1),
      values: z.string().min(1),
    }),
    defaultConfig: { connectionId: '', spreadsheetId: '', range: 'Sheet1!A1', values: '' },
    fields: [
      { name: 'connectionId', label: 'Google connection', type: 'connection' },
      { name: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
      { name: 'range', label: 'Range', type: 'text', placeholder: 'Sheet1!A1' },
      { name: 'values', label: 'Row values (comma-separated)', type: 'text', placeholder: '{{trigger.name}}, {{trigger.email}}' },
    ],
    handles: { source: ['out'], target: true },
  },

  hubspot_create_contact: {
    key: 'hubspot_create_contact',
    label: 'HubSpot contact',
    kind: 'ACTION',
    description: 'Create a contact in HubSpot via an OAuth connection.',
    connectionType: 'hubspot',
    configSchema: z.object({
      connectionId: z.string().min(1),
      email: z.string().email(),
      firstname: z.string().optional(),
      lastname: z.string().optional(),
    }),
    defaultConfig: { connectionId: '', email: '', firstname: '', lastname: '' },
    fields: [
      { name: 'connectionId', label: 'HubSpot connection', type: 'connection' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'firstname', label: 'First name', type: 'text' },
      { name: 'lastname', label: 'Last name', type: 'text' },
    ],
    handles: { source: ['out'], target: true },
  },
```

- [ ] **Step 7: Run tests**

Run: `npm test -- lib/connectors/connectors.test.ts lib/steps/registry.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/connectors/googlesheets.ts lib/connectors/hubspot.ts lib/connectors/index.ts lib/steps/registry.ts lib/connectors/connectors.test.ts
git commit -m "feat: google sheets + hubspot connectors and step types (tdd)"
```

### Task B5: OAuth start + callback routes

**Files:** Create `lib/connections/oauth-state.ts` (signed-cookie helper), `app/api/connections/oauth/[provider]/start/route.ts`, `app/api/connections/oauth/[provider]/callback/route.ts`.

- [ ] **Step 1: Implement `lib/connections/oauth-state.ts`** (HMAC-signed state payload):

```ts
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export interface OAuthState {
  state: string
  provider: string
  workspaceId: string
}

function secret(): string {
  return process.env.AUTH_SECRET ?? 'dev-secret'
}

export function newStateToken(provider: string, workspaceId: string): { token: string; state: string } {
  const state = randomBytes(16).toString('hex')
  const payload = JSON.stringify({ state, provider, workspaceId } satisfies OAuthState)
  const body = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return { token: `${body}.${sig}`, state }
}

export function readStateToken(token: string | undefined): OAuthState | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthState
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Implement `start/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { oauthEnabled, buildAuthorizeUrl, type OAuthProviderId } from '@/lib/connections/oauth'
import { newStateToken } from '@/lib/connections/oauth-state'

export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  if (!oauthEnabled(provider)) {
    return NextResponse.json({ error: 'This integration is not configured.' }, { status: 404 })
  }
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const { token, state } = newStateToken(provider, active.workspace.id)
  const url = buildAuthorizeUrl(provider as OAuthProviderId, state)
  const res = NextResponse.redirect(url)
  res.cookies.set('oauth_state', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
```

- [ ] **Step 3: Implement `callback/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import { oauthEnabled, exchangeCode, getOAuthProvider, type OAuthProviderId } from '@/lib/connections/oauth'
import { readStateToken } from '@/lib/connections/oauth-state'

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookie = req.headers.get('cookie') ?? ''
  const token = cookie.split(/;\s*/).find((c) => c.startsWith('oauth_state='))?.slice('oauth_state='.length)
  const saved = readStateToken(token ? decodeURIComponent(token) : undefined)

  const fail = () => NextResponse.redirect(new URL('/app/connections?error=oauth', req.url))

  if (!oauthEnabled(provider) || !code || !state || !saved) return fail()
  if (saved.provider !== provider || saved.state !== state) return fail()

  try {
    const tokens = await exchangeCode(provider as OAuthProviderId, code)
    const def = getOAuthProvider(provider)
    await db.connection.create({
      data: {
        workspaceId: saved.workspaceId,
        type: def.connectionType,
        name: `${provider === 'google' ? 'Google Sheets' : 'HubSpot'} account`,
        secret: encrypt(JSON.stringify(tokens)),
      },
    })
  } catch {
    return fail()
  }
  const res = NextResponse.redirect(new URL(`/app/connections?connected=${provider}`, req.url))
  res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 })
  return res
}
```

- [ ] **Step 4: Verify build-safe typecheck/lint**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add lib/connections/oauth-state.ts app/api/connections/oauth
git commit -m "feat: oauth start + callback routes (signed state, encrypted token storage)"
```

### Task B6: Connections UI — oauth connect buttons + filtering

**Files:** Modify `app/(app)/app/connections/page.tsx`, `ConnectionsClient.tsx`, and `app/api/connections/route.ts` (guard against oauth type via manual POST).

- [ ] **Step 1: Page** — pass `auth`/`provider` and an `enabledProviders` set. In `page.tsx`:

```tsx
import { oauthEnabled } from '@/lib/connections/oauth'
// …
const types = listConnectionTypes()
  .filter((t) => t.auth !== 'oauth' || oauthEnabled(t.provider ?? ''))
  .map((t) => ({ type: t.type, label: t.label, fields: t.fields, auth: t.auth, provider: t.provider ?? null }))
```
Pass `types` to the client (replace the existing `types` prop). Keep `connections` mapping.

- [ ] **Step 2: Client** — extend `ConnType` with `auth: 'apikey' | 'oauth'` and `provider: string | null`. When `selected?.auth === 'oauth'`, replace the field inputs + Save button with:

```tsx
{selected?.auth === 'oauth' ? (
  <a
    href={`/api/connections/oauth/${selected.provider}/start`}
    className="inline-flex items-center justify-center rounded-lg bg-fog px-4 py-2.5 text-sm font-semibold text-ink"
  >
    Connect with {selected.label}
  </a>
) : (
  <>
    {/* existing name + fields + Save button */}
  </>
)}
```
Also read `?connected` / `?error` via `useSearchParams` and show a banner ("Connected!" / "Could not connect.").

- [ ] **Step 3: Guard the manual POST** — in `app/api/connections/route.ts`, after parsing, reject oauth types:

```ts
import { getConnectionType } from '@/lib/connections/registry'
// …after parsed success:
try {
  if (getConnectionType(parsed.data.type).auth === 'oauth') {
    return NextResponse.json({ error: 'Use the Connect button for this integration.' }, { status: 400 })
  }
} catch {
  return NextResponse.json({ error: 'Unknown connection type' }, { status: 400 })
}
```

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/app/connections/page.tsx" "app/(app)/app/connections/ConnectionsClient.tsx" app/api/connections/route.ts
git commit -m "feat: connections UI for oauth (connect buttons, provider filtering, banner)"
```

---

## Milestone C: Test connection

### Task C1: `lib/connections/test.ts`

**Files:** Create `lib/connections/test.ts`; Test `lib/connections/test.test.ts`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { testConnection } from './test'

afterEach(() => vi.unstubAllGlobals())

describe('testConnection', () => {
  it('telegram calls getMe and reports ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const r = await testConnection('telegram', { botToken: 'abc' })
    expect(fetchMock.mock.calls[0][0]).toContain('/botabc/getMe')
    expect(r.ok).toBe(true)
  })

  it('openai reports failure on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const r = await testConnection('openai', { apiKey: 'sk' })
    expect(r.ok).toBe(false)
    expect(r.message).toContain('401')
  })

  it('slack posts a test message to the webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const r = await testConnection('slack', { webhookUrl: 'https://hooks/x' })
    expect(fetchMock).toHaveBeenCalledWith('https://hooks/x', expect.objectContaining({ method: 'POST' }))
    expect(r.ok).toBe(true)
  })

  it('hubspot uses the bearer access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await testConnection('hubspot', { accessToken: 'at' })
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer at')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/connections/test.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/connections/test.ts`**

```ts
export interface TestResult {
  ok: boolean
  message: string
}

type Secret = Record<string, string>

async function probe(url: string, init: RequestInit, label = 'Working'): Promise<TestResult> {
  try {
    const res = await fetch(url, init)
    if (res.ok) return { ok: true, message: label }
    return { ok: false, message: `Failed (HTTP ${res.status})` }
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Request failed' }
  }
}

export async function testConnection(type: string, secret: Secret): Promise<TestResult> {
  switch (type) {
    case 'telegram':
      return probe(`https://api.telegram.org/bot${secret.botToken ?? ''}/getMe`, {})
    case 'airtable':
      return probe('https://api.airtable.com/v0/meta/whoami', {
        headers: { Authorization: `Bearer ${secret.apiKey ?? ''}` },
      })
    case 'notion':
      return probe('https://api.notion.com/v1/users/me', {
        headers: { Authorization: `Bearer ${secret.token ?? ''}`, 'Notion-Version': '2022-06-28' },
      })
    case 'openai':
      return probe('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${secret.apiKey ?? ''}` },
      })
    case 'google_sheets':
      return probe('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${secret.accessToken ?? ''}` },
      })
    case 'hubspot':
      return probe('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { Authorization: `Bearer ${secret.accessToken ?? ''}` },
      })
    case 'slack':
    case 'discord':
      return probe(secret.webhookUrl ?? '', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          type === 'slack' ? { text: 'Cadence connection test ✓' } : { content: 'Cadence connection test ✓' },
        ),
      }, 'Test message sent')
    default:
      return { ok: false, message: `No test available for ${type}` }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/connections/test.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/connections/test.ts lib/connections/test.test.ts
git commit -m "feat: testConnection per-type connection verification (tdd)"
```

### Task C2: `POST /api/connections/[id]/test`

**Files:** Create `app/api/connections/[id]/test/route.ts`.

- [ ] **Step 1: Implement**

```ts
import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { db } from '@/lib/db'
import { getUsableSecret } from '@/lib/connections'
import { testConnection } from '@/lib/connections/test'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const conn = await db.connection.findFirst({
    where: { id, workspaceId: active.workspace.id },
    select: { type: true },
  })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const secret = await getUsableSecret(id, active.workspace.id)
  if (!secret) return NextResponse.json({ ok: false, message: 'No credentials' })
  const result = await testConnection(conn.type, secret)
  return NextResponse.json(result)
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add app/api/connections/[id]/test/route.ts
git commit -m "feat: POST /api/connections/[id]/test endpoint"
```

### Task C3: Test buttons in UI

**Files:** Modify `app/(app)/app/connections/ConnectionsClient.tsx`, `components/builder/ConfigPanel.tsx`.

- [ ] **Step 1: Connections list Test button** — add per-row state + handler in `ConnectionsClient.tsx`:

```tsx
const [testResult, setTestResult] = useState<Record<string, string>>({})
async function test(id: string) {
  setTestResult((r) => ({ ...r, [id]: '…' }))
  const res = await fetch(`/api/connections/${id}/test`, { method: 'POST' })
  const j = await res.json().catch(() => ({ ok: false, message: 'Error' }))
  setTestResult((r) => ({ ...r, [id]: j.ok ? '✓ ' + j.message : '✗ ' + j.message }))
}
```
In each `<li>`, before Delete, add a `Test` button and render `testResult[c.id]` in muted text.

- [ ] **Step 2: ConfigPanel Test button** — in the `connection` field branch, when a connection is selected (`strValue` truthy), render a Test button under the select:

```tsx
{strValue && (
  <ConnectionTestButton connectionId={strValue} />
)}
```
Add a small inline component in ConfigPanel (or a new `components/builder/ConnectionTestButton.tsx`):

```tsx
function ConnectionTestButton({ connectionId }: { connectionId: string }) {
  const [result, setResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="mt-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setResult(null)
          const res = await fetch(`/api/connections/${connectionId}/test`, { method: 'POST' })
          const j = await res.json().catch(() => ({ ok: false, message: 'Error' }))
          setResult(j.ok ? `✓ ${j.message}` : `✗ ${j.message}`)
          setBusy(false)
        }}
        className="text-xs font-semibold text-cyan hover:underline"
      >
        {busy ? 'Testing…' : 'Test connection'}
      </button>
      {result && <p className="mt-1 text-xs text-muted">{result}</p>}
    </div>
  )
}
```
Add `import { useState } from 'react'` to ConfigPanel.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/app/connections/ConnectionsClient.tsx" components/builder/ConfigPanel.tsx
git commit -m "feat: test-connection buttons in builder config + connections list"
```

---

## Milestone D: Analytics dashboard

### Task D1: `lib/analytics.ts`

**Files:** Create `lib/analytics.ts`; Test `lib/analytics.test.ts`.

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect } from 'vitest'
import { summarizeRuns } from './analytics'

const now = new Date('2026-06-11T12:00:00Z')

function run(status: string, daysAgo: number, workflowName = 'W1') {
  return {
    status,
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000),
    workflowId: workflowName,
    workflowName,
  }
}

describe('summarizeRuns', () => {
  it('counts statuses and success rate', () => {
    const s = summarizeRuns(
      [run('SUCCEEDED', 0), run('SUCCEEDED', 1), run('FAILED', 1)],
      { now, days: 7 },
    )
    expect(s.total).toBe(3)
    expect(s.succeeded).toBe(2)
    expect(s.failed).toBe(1)
    expect(s.successRate).toBe(67) // round(2/3*100)
  })

  it('zero-fills perDay to the window length, oldest first', () => {
    const s = summarizeRuns([run('SUCCEEDED', 0)], { now, days: 14 })
    expect(s.perDay).toHaveLength(14)
    expect(s.perDay[13].date).toBe('2026-06-11')
    expect(s.perDay[13].succeeded).toBe(1)
    expect(s.perDay[0].succeeded).toBe(0)
  })

  it('ranks top workflows by count, max 5', () => {
    const runs = [
      run('SUCCEEDED', 0, 'A'),
      run('SUCCEEDED', 0, 'A'),
      run('FAILED', 0, 'B'),
    ]
    const s = summarizeRuns(runs, { now, days: 7 })
    expect(s.topWorkflows[0]).toEqual({ name: 'A', count: 2 })
    expect(s.topWorkflows.length).toBeLessThanOrEqual(5)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- lib/analytics.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `lib/analytics.ts`**

```ts
export interface RunRow {
  status: string
  createdAt: Date
  workflowId: string
  workflowName: string
}

export interface DayBucket {
  date: string // YYYY-MM-DD (UTC)
  succeeded: number
  failed: number
}

export interface RunsSummary {
  total: number
  succeeded: number
  failed: number
  active: number
  successRate: number
  perDay: DayBucket[]
  topWorkflows: { name: string; count: number }[]
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function summarizeRuns(
  runs: RunRow[],
  { now = new Date(), days = 30 }: { now?: Date; days?: number } = {},
): RunsSummary {
  let succeeded = 0
  let failed = 0
  let active = 0
  const byDay = new Map<string, DayBucket>()
  const byWorkflow = new Map<string, number>()

  // Seed zero-filled day buckets, oldest → newest.
  const buckets: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000)
    const key = dayKey(d)
    const bucket = { date: key, succeeded: 0, failed: 0 }
    byDay.set(key, bucket)
    buckets.push(bucket)
  }

  for (const r of runs) {
    if (r.status === 'SUCCEEDED') succeeded++
    else if (r.status === 'FAILED') failed++
    else active++

    const bucket = byDay.get(dayKey(r.createdAt))
    if (bucket) {
      if (r.status === 'SUCCEEDED') bucket.succeeded++
      else if (r.status === 'FAILED') bucket.failed++
    }
    byWorkflow.set(r.workflowName, (byWorkflow.get(r.workflowName) ?? 0) + 1)
  }

  const finished = succeeded + failed
  const successRate = finished === 0 ? 0 : Math.round((succeeded / finished) * 100)
  const topWorkflows = [...byWorkflow.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    total: runs.length,
    succeeded,
    failed,
    active,
    successRate,
    perDay: buckets,
    topWorkflows,
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- lib/analytics.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/analytics.ts lib/analytics.test.ts
git commit -m "feat: summarizeRuns analytics aggregation (tdd)"
```

### Task D2: Analytics page + client chart

**Files:** Create `app/(app)/app/analytics/page.tsx`, `app/(app)/app/analytics/AnalyticsClient.tsx`; Modify `components/app/Sidebar.tsx`.

- [ ] **Step 1: Implement `page.tsx`**

```tsx
import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { db } from '@/lib/db'
import { summarizeRuns } from '@/lib/analytics'
import { getWorkspacePlan, runsThisMonth } from '@/lib/billing'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')

  const since = new Date(Date.now() - 30 * 86_400_000)
  const runs = await db.workflowRun.findMany({
    where: { workspaceId: active.workspace.id, createdAt: { gte: since } },
    select: { status: true, createdAt: true, workflowId: true, workflow: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })
  const summary = summarizeRuns(
    runs.map((r) => ({
      status: r.status,
      createdAt: r.createdAt,
      workflowId: r.workflowId,
      workflowName: r.workflow?.name ?? 'Untitled',
    })),
    { days: 30 },
  )
  const plan = await getWorkspacePlan(active.workspace.id)
  const monthRuns = await runsThisMonth(active.workspace.id)

  return (
    <AnalyticsClient
      summary={summary}
      quota={{ used: monthRuns, limit: plan.maxRunsPerMonth }}
    />
  )
}
```
Note: confirm the exact exported names/signatures in `lib/billing.ts` (`getWorkspacePlan`, `runsThisMonth`) and `plan.maxRunsPerMonth`; adjust to the real API while reading the file.

- [ ] **Step 2: Implement `AnalyticsClient.tsx`** (`'use client'`, Recharts):

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { RunsSummary } from '@/lib/analytics'

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

export function AnalyticsClient({
  summary,
  quota,
}: {
  summary: RunsSummary
  quota: { used: number; limit: number | null }
}) {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Analytics</h1>

      {summary.total === 0 ? (
        <div className="rounded-2xl border border-line p-12 text-center">
          <h2 className="font-display text-xl font-bold">No runs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Once your workflows start running, you&apos;ll see success rates and trends here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <Kpi label="Runs (30d)" value={String(summary.total)} />
            <Kpi label="Success rate" value={`${summary.successRate}%`} />
            <Kpi label="Failed" value={String(summary.failed)} />
            <Kpi
              label="Runs this month"
              value={`${quota.used.toLocaleString()}${quota.limit === null ? '' : ` / ${quota.limit.toLocaleString()}`}`}
            />
          </div>

          <div className="mb-8 rounded-2xl border border-line p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
              Runs over time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.perDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9aa' }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9aa' }} />
                <Tooltip contentStyle={{ background: '#10131a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="succeeded" stackId="a" fill="#34d399" />
                <Bar dataKey="failed" stackId="a" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
              Top workflows
            </h2>
            <ResponsiveContainer width="100%" height={Math.max(120, summary.topWorkflows.length * 48)}>
              <BarChart data={summary.topWorkflows} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#9aa' }} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#9aa' }} />
                <Tooltip contentStyle={{ background: '#10131a', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Sidebar** — add to `components/app/Sidebar.tsx`: import `BarChart3` from `lucide-react`; insert `{ href: '/app/analytics', label: 'Analytics', icon: BarChart3 }` after Runs.

- [ ] **Step 4: Verify build (Recharts SSR safety)**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: build succeeds. If Recharts triggers an SSR/ESM build error, add `export const dynamic = 'force-dynamic'` or wrap the chart client import with `next/dynamic` `{ ssr: false }` — only if the plain build fails.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/app/analytics" components/app/Sidebar.tsx
git commit -m "feat: analytics dashboard with recharts (runs over time, top workflows, KPIs)"
```

---

## Milestone E: E2E, docs, full verification

### Task E1: E2E tests

**Files:** Create `e2e/analytics.spec.ts`; extend `e2e/connections.spec.ts`, `e2e/workflows.spec.ts`.

- [ ] **Step 1: `e2e/analytics.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `analytics+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Analytics User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('analytics page renders (empty state for a new workspace)', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  await expect(page.getByText(/no runs yet/i)).toBeVisible()
})
```

- [ ] **Step 2: connections — oauth buttons absent when unconfigured** — append to `e2e/connections.spec.ts`:

```ts
test('oauth connect buttons are hidden when providers are unconfigured', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/connections')
  await page.getByRole('button', { name: /add connection/i }).click()
  await expect(page.getByRole('link', { name: /connect with google sheets/i })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /connect with hubspot/i })).toHaveCount(0)
})
```
(Reuse the file's existing `signUp`.)

- [ ] **Step 3: schedule UX** — append to `e2e/workflows.spec.ts` a test that creates a workflow, adds a schedule trigger, opens it, picks "Every hour", and asserts the description text. Match the file's existing helpers/selectors for adding nodes and opening config. Concretely:

```ts
test('schedule trigger shows a human-readable description', async ({ page }) => {
  await signUp(page) // reuse file helper
  // create a workflow and open the builder (follow the pattern already in this file)
  // add a Schedule trigger node, click it to open the config panel
  await page.getByLabel('Frequency').selectOption({ label: 'Every hour' })
  await expect(page.getByText(/every hour/i)).toBeVisible()
})
```
Adapt the workflow-creation/builder-open steps to the existing test's approach before the schedule assertions.

- [ ] **Step 4: Run E2E**

Run: `npm run e2e`
Expected: all pass. Debug any selector mismatches against the real DOM.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "test: analytics, oauth-degradation, schedule-ux e2e"
```

### Task E2: Docs + env wiring (CI, playwright, README, DEPLOYMENT)

**Files:** Modify `README.md`, `docs/DEPLOYMENT.md`. (CI/playwright env need no new required vars — OAuth is optional and absent in tests, which is the intended degradation path.)

- [ ] **Step 1: README** — update "What works today" with OAuth connections (Google Sheets/HubSpot), the test button, schedule UX, and the analytics dashboard; add the four new env vars to the Environment section; add ✅ Phase 6 to the roadmap.

- [ ] **Step 2: DEPLOYMENT.md** — add an optional step documenting the Google (separate connect app) + HubSpot OAuth apps: client id/secret env, the redirect URIs `https://<APP_URL>/api/connections/oauth/google/callback` and `.../hubspot/callback`, and required scopes.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/DEPLOYMENT.md
git commit -m "docs: phase 6 oauth connections, test button, schedule ux, analytics"
```

### Task E3: Full green + build-without-secrets verification

- [ ] **Step 1: Full unit + types + lint**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 2: Build with no OAuth env (Vercel scenario)**

```bash
export PATH="$HOME/.nvm/versions/node/v22.22.3/bin:$PATH"
mv .env .env.bak 2>/dev/null || true
NEXT_PHASE=phase-production-build GOOGLE_CONNECT_CLIENT_ID= HUBSPOT_CLIENT_ID= npm run build
mv .env.bak .env 2>/dev/null || true
```
Expected: build succeeds; no crash from missing OAuth env.

- [ ] **Step 3: Final E2E**

Run: `npm run e2e`
Expected: pass.

- [ ] **Step 4: Push + PR**

```bash
git push -u origin claude/phase6-oauth-test-schedule-analytics
gh pr create --title "Phase 6: OAuth connections, test button, schedule UX, analytics" --body "<summary>"
```

---

## Self-Review Notes

- **Spec coverage:** OAuth (B1–B6), test button (C1–C3), schedule UX (A1–A2), analytics (D1–D2), docs/E2E/build (E1–E3). All four spec sections mapped.
- **Type consistency:** `ScheduleValue {mode,value}`, `OAuthTokens {accessToken,refreshToken,expiresAt,scope}`, `RunsSummary`/`RunRow`, `TestResult {ok,message}` used consistently across tasks and tests.
- **Graceful degradation:** oauthEnabled filters types + guards routes; engine refresh only for oauth; analytics/test/schedule have no provider deps.
- **Watch points flagged inline:** cron-parser export name (A1 step 4), execute.test mock name (B3 step 5), billing.ts exact API (D2 step 1), Recharts SSR build (D2 step 4), e2e selector adaptation (E1 step 3).
