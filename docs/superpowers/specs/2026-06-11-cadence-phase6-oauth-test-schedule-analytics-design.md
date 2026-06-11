# Cadence Phase 6 — OAuth Connections, Test Button, Schedule UX & Analytics (Design)

**Status:** Approved 2026-06-11
**Depends on:** Phase 5 (encrypted Connections, connectors, templates)

## Goal

Four user-facing capabilities, each degrading gracefully when its optional
provider credentials are absent (the Vercel-without-secrets scenario):

1. **OAuth-based connections** for Google Sheets and HubSpot — a real
   authorize → callback → token-refresh flow, plus two connectors.
2. **Per-step "Test connection"** button — verify a stored connection works
   before relying on it in a run.
3. **Scheduled-trigger UI improvements** — presets, a human-readable
   description, and a next-run preview for the `schedule` trigger.
4. **Analytics dashboard** at `/app/analytics` — run metrics rendered with a
   charting library (Recharts).

## Decisions (from brainstorming)

- **Google OAuth:** a *separate* OAuth app dedicated to connections
  (`GOOGLE_CONNECT_CLIENT_ID/SECRET`), distinct from the sign-in Google app
  (`AUTH_GOOGLE_ID/SECRET`). Keeps login and data-access scopes independent.
- **Charts:** a charting library — **Recharts** (React 19 compatible, v3).

## 1. OAuth connections (Google Sheets, HubSpot)

### Storage
No schema change. OAuth tokens reuse the existing encrypted `Connection.secret`
column, storing JSON: `{ accessToken, refreshToken, expiresAt, scope }` where
`expiresAt` is an epoch-millis number serialized as a string (all secret fields
are strings, consistent with the existing `Record<string,string>` shape).

### Connection-type registry
`ConnectionType` gains `auth: 'apikey' | 'oauth'` (defaults to `'apikey'` for the
existing six). OAuth types add a `provider` key. Two new types:

- `google_sheets` → `auth: 'oauth'`, `provider: 'google'`, no input fields.
- `hubspot` → `auth: 'oauth'`, `provider: 'hubspot'`, no input fields.

`createConnection` only validates/encrypts `fields` for apikey types; oauth
connections are created by the callback route, not the manual form.

### Provider OAuth config — `lib/connections/oauth.ts`
A registry keyed by provider:

```ts
interface OAuthProvider {
  provider: 'google' | 'hubspot'
  connectionType: string        // 'google_sheets' | 'hubspot'
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  extraAuthParams?: Record<string, string>  // google: access_type=offline, prompt=consent
}
```

- `google`: authorize `https://accounts.google.com/o/oauth2/v2/auth`, token
  `https://oauth2.googleapis.com/token`, scope
  `https://www.googleapis.com/auth/spreadsheets`, extra params
  `access_type=offline&prompt=consent` (forces a refresh token).
- `hubspot`: authorize `https://app.hubspot.com/oauth/authorize`, token
  `https://api.hubapi.com/oauth/v1/token`, scope `crm.objects.contacts.write`.

Pure, testable helpers:
- `oauthEnabled(provider)` — both client-id and client-secret env present.
- `redirectUri(provider)` — `${APP_URL}/api/connections/oauth/${provider}/callback`.
- `buildAuthorizeUrl(provider, state)` — assembles the full URL with `client_id`,
  `redirect_uri`, `response_type=code`, `scope`, `state`, and extra params.
- `exchangeCode(provider, code)` — POST to `tokenUrl`, returns
  `{ accessToken, refreshToken, expiresAt, scope }`.
- `refreshAccessToken(provider, refreshToken)` — POST `grant_type=refresh_token`,
  returns refreshed tokens (HubSpot rotates refresh tokens; keep the new one if
  returned, else the old).

### Flow routes
- `GET /api/connections/oauth/[provider]/start` — auth + MEMBER. 404/JSON error
  if `!oauthEnabled`. Generate a random `state`; set a signed, httpOnly,
  short-lived cookie `oauth_state` holding `{ state, provider, workspaceId }`
  (signed via HMAC with `AUTH_SECRET`); redirect to `buildAuthorizeUrl`.
- `GET /api/connections/oauth/[provider]/callback` — read `code` + `state`;
  validate against the cookie (state match, provider match); `exchangeCode`;
  create an encrypted Connection (name `"<Provider> account"`); clear the cookie;
  redirect to `/app/connections?connected=<provider>`. On error redirect to
  `/app/connections?error=oauth`.

### Token refresh on use — `getUsableSecret(connectionId, workspaceId)`
New function in `lib/connections.ts`. Loads + decrypts the connection. If its
type is oauth and `expiresAt` is within 60s of now, calls
`refreshAccessToken`, re-encrypts, persists, and returns the refreshed secret;
otherwise returns the decrypted secret unchanged. Apikey connections pass through
untouched. **The engine calls `getUsableSecret` instead of `getDecryptedSecret`.**

### Connectors
- `google_sheets_append` (connectionType `google_sheets`): POST to
  `https://sheets.googleapis.com/v4/spreadsheets/{spreadsheetId}/values/{range}:append?valueInputOption=USER_ENTERED`
  with `Bearer accessToken`; body `{ values: [[...]] }`. Config: `spreadsheetId`,
  `range` (e.g. `Sheet1!A1`), `values` (comma-separated → one row).
- `hubspot_create_contact` (connectionType `hubspot`): POST to
  `https://api.hubapi.com/crm/v3/objects/contacts` with `Bearer accessToken`;
  body `{ properties: { email, firstname, lastname } }`. Config: `email`,
  `firstname`, `lastname`.

Both throw on missing `accessToken` and on non-OK responses, matching existing
connector conventions.

### Step types
`google_sheets_append` and `hubspot_create_contact` added to the steps registry
with `connectionType` set, so the builder shows the connection selector.

### Connections UI
The "Add connection" form: when an oauth type is selected, hide the field inputs
and the manual Save; instead render a **"Connect with Google/HubSpot"** button
linking to `/api/connections/oauth/[provider]/start`. Oauth types whose provider
is not enabled (`oauthEnabled` false) are filtered out of the type list so users
never see a dead button. A `?connected=` / `?error=` query shows a toast/banner.

### Env
Add optional `GOOGLE_CONNECT_CLIENT_ID`, `GOOGLE_CONNECT_CLIENT_SECRET`,
`HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET` to `lib/env.ts`, `.env.example`,
deployment docs.

## 2. Per-step "Test connection" button

### Endpoint — `POST /api/connections/[id]/test`
Auth + MEMBER. `getUsableSecret` (refreshes oauth). Dispatch to a per-type test
in a new `lib/connections/test.ts` `testConnection(type, secret)`:

| type | check (no/low side effect) |
| --- | --- |
| telegram | `GET getMe` |
| airtable | `GET https://api.airtable.com/v0/meta/whoami` |
| notion | `GET https://api.notion.com/v1/users/me` |
| openai | `GET https://api.openai.com/v1/models` (limit irrelevant) |
| google_sheets | `GET https://www.googleapis.com/oauth2/v3/userinfo` |
| hubspot | `GET https://api.hubapi.com/crm/v3/objects/contacts?limit=1` |
| slack | POST a one-line `"Cadence connection test ✓"` to the webhook |
| discord | POST a one-line test content to the webhook |

Returns `{ ok: boolean, message: string }` (`ok:false` with the provider status
on failure; never throws to the client).

### UI
- **Builder ConfigPanel:** next to the connection selector, a **Test** button
  enabled when a connection is selected; calls the endpoint and shows
  `✓ Working` / `✗ <message>` inline.
- **Connections list:** a **Test** button per row with the same inline result.

## 3. Scheduled-trigger UI improvements

A dedicated `ScheduleConfig` panel rendered by ConfigPanel when
`node.data.stepType === 'schedule'` (instead of the generic two fields). It still
serializes to the existing `{ mode, value }` so the queue
(`upsertSchedule`) is unchanged.

Pure helpers in `lib/schedule.ts`:
- `SCHEDULE_PRESETS` — labeled presets mapping to `{mode,value}`:
  every 15 min (`interval`/`15`), hourly (`cron`/`0 * * * *`), daily 9am
  (`cron`/`0 9 * * *`), weekly Mon 9am (`cron`/`0 9 * * 1`), plus "Custom".
- `describeSchedule({mode,value})` — human text. Interval → `"Every N minutes"`;
  cron → `cronstrue.toString(value)` (guarded; returns `"Invalid cron expression"`
  on throw).
- `nextRun({mode,value}, from)` — next Date. Interval → `from + N*60_000`; cron →
  `cron-parser` parse → next(); returns `null` on invalid.
- `validateCron(value)` — boolean via cron-parser try/catch.

The panel: preset `<select>`; when Custom, an interval number input (minutes) or a
cron text input chosen by mode; live description + "Next run: <relative/abs>"
preview; an inline "Invalid cron expression" error when applicable.

**Deps:** `cron-parser`, `cronstrue`.

## 4. Analytics dashboard (`/app/analytics`)

### Aggregation — `lib/analytics.ts`
Pure `summarizeRuns(runs, { now, days })` over
`{ status, createdAt, workflowId, workflowName }[]`:
- `total`, `succeeded`, `failed`, `running`/`queued` counts.
- `successRate` (succeeded / finished, 0 when none).
- `perDay`: array of `{ date: 'YYYY-MM-DD', succeeded, failed }` for the last
  `days` days (zero-filled, oldest→newest, UTC).
- `topWorkflows`: top 5 `{ name, count }` by run count.

The page server-loads the workspace's runs for the last 30 days
(`db.workflowRun.findMany` with workflow name via include/select), calls
`summarizeRuns`, and passes the summary + plan usage (reusing `getWorkspacePlan`,
`runsThisMonth` from `lib/billing.ts`) to a client `AnalyticsClient`.

### UI — `AnalyticsClient` (`'use client'`, Recharts)
- KPI cards: total runs (30d), success rate, failed, runs this month / quota.
- Runs-over-time: stacked `BarChart` (succeeded/failed) over `perDay`.
- Top workflows: horizontal `BarChart`.
- Empty state when `total === 0`.

Recharts colors via the app's CSS variables/Tailwind palette. Add **Analytics**
to the sidebar (icon `BarChart3`).

**Dep:** `recharts`.

## Testing

**Unit (Vitest):**
- `oauth.ts`: `buildAuthorizeUrl` includes client_id/redirect/scope/state/extra
  params; `oauthEnabled` reflects env; `exchangeCode`/`refreshAccessToken` parse
  a mocked token response into `{accessToken,refreshToken,expiresAt,scope}`.
- `connections.getUsableSecret`: refreshes when expired, persists, returns new
  token; passes through when fresh; passes through apikey unchanged (mocked db +
  mocked refresh).
- `test.ts`: `testConnection` dispatches to the right URL per type and maps
  ok/!ok to `{ok,message}` (mocked fetch).
- `schedule.ts`: preset↔`{mode,value}` mapping; `describeSchedule` for interval
  and cron; `nextRun` for interval and a known cron; `validateCron` true/false.
- `analytics.summarizeRuns`: counts, success rate, zero-filled perDay length =
  days, topWorkflows ordering/limit.
- new connectors: google_sheets_append posts to the values:append URL with
  Bearer; hubspot_create_contact posts contact properties; both throw without a
  token (mocked fetch).

**E2E (Playwright):**
- Analytics page renders KPI headings after signup (empty state ok).
- Schedule trigger: open a workflow's schedule node, pick the "Every hour"
  preset, and assert the human-readable description updates.
- Connections: the oauth "Connect with…" buttons are absent when providers are
  unconfigured (the default test env), proving graceful degradation.

**Build:** verify `NEXT_PHASE=phase-production-build` build is green with no OAuth
env set.

## Out of scope
OAuth for more providers; per-provider webhook signature verification;
scheduled-run calendar; analytics drill-down/export; real-time analytics.

## Honesty caveat
OAuth connections only function live once the operator creates their own Google
and HubSpot OAuth apps (client id/secret, registered redirect URIs, approved
scopes). Without them the "Connect with…" buttons are hidden and every other
Phase 6 feature works.
