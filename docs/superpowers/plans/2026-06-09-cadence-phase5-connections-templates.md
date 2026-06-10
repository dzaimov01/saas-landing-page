# Cadence Phase 5 — Connections, Integrations & Templates Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Encrypted reusable Connections, 7 new connectors, builder integration, and a templates gallery.

**Tech Stack:** Next.js 15, Prisma 6, Node crypto (AES-256-GCM), Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase5-connections-templates-design.md`

**Conventions:** Node 22, `npm`, commit per milestone, Postgres :5433, Redis :6380, test port 3100. Build must stay green with no `ENCRYPTION_KEY`.

---

## Milestone A — Crypto + env

### Task A1: `lib/crypto.ts` (TDD)
- [ ] Add `ENCRYPTION_KEY: z.string().optional()` to `lib/env.ts` (schema + raw).
- [ ] Implement `encryptionEnabled()`, `encrypt(text)`, `decrypt(blob)` with AES-256-GCM:
```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
function key(){ const k = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'base64'); if (k.length!==32) throw new Error('ENCRYPTION_KEY must be base64 of 32 bytes'); return k }
export function encryptionEnabled(){ try { key(); return true } catch { return false } }
export function encrypt(text:string){ const iv=randomBytes(12); const c=createCipheriv('aes-256-gcm',key(),iv); const ct=Buffer.concat([c.update(text,'utf8'),c.final()]); const tag=c.getAuthTag(); return [iv.toString('base64'),tag.toString('base64'),ct.toString('base64')].join('.') }
export function decrypt(blob:string){ const [iv,tag,ct]=blob.split('.').map(p=>Buffer.from(p,'base64')); const d=createDecipheriv('aes-256-gcm',key(),iv); d.setAuthTag(tag); return Buffer.concat([d.update(ct),d.final()]).toString('utf8') }
```
- [ ] Test `lib/crypto.test.ts` (set `process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')` in the test): round-trips a string; a tampered blob throws; `encryptionEnabled()` true.
- [ ] Red→green. Commit: `feat: aes-256-gcm secret encryption (tdd)`.

## Milestone B — Connection model + registry + service

### Task B1: Model + migration
- [ ] Add `Connection` model + `connections Connection[]` on `Workspace` (spec). `prisma validate && generate`; migration via `prisma migrate diff ... --script` → `prisma migrate deploy`.
- [ ] Commit: `feat: connection model + migration`.

### Task B2: Connection-type registry + service (TDD where pure)
- [ ] `lib/connections/registry.ts`: `CONNECTION_TYPES` (slack/discord→webhookUrl; telegram→botToken; airtable/openai→apiKey; notion→token), `getConnectionType`, `listConnectionTypes`. Each field `{ name, label, type:'text', placeholder? }`.
- [ ] `lib/connections.ts`: `listConnections`, `createConnection` (zod-validate fields against the type, `encrypt(JSON.stringify(fields))`), `deleteConnection`, `getDecryptedSecret` (`JSON.parse(decrypt(secret))`).
- [ ] Test `lib/connections.test.ts` (mocked db + real crypto with a test key): `createConnection` stores an encrypted blob (not plaintext); `getDecryptedSecret` returns the original fields.
- [ ] Red→green. Commit: `feat: connection registry + service (tdd)`.

## Milestone C — Connections CRUD

### Task C1: API + UI
- [ ] `POST /api/connections` (MEMBER; `{type,name,fields}`; 400 if `!encryptionEnabled()`), `DELETE /api/connections/[id]` (MEMBER).
- [ ] `/app/connections/page.tsx` (server: `listConnections` + `encryptionEnabled`) + `ConnectionsClient` (list, add-modal: pick type → render fields → submit, delete). Never receives secrets.
- [ ] `npm run build`. Commit: `feat: connections crud api + ui`.

## Milestone D — Connectors + engine

### Task D1: New connectors (TDD)
- [ ] `Connector` type → `(config, ctx, secret?) => Promise<unknown>`.
- [ ] Implement `discord`, `telegram`, `airtable`, `notion`, `openai`, `set_data`, `filter` (spec §2); migrate `slack` to read `secret.webhookUrl`. Register in `CONNECTORS`.
- [ ] Tests (mocked `fetch`): discord posts content to `secret.webhookUrl`; openai returns `{text}` from the choice; filter returns `{passed:false}` for a failing test; set_data returns parsed json. Update the existing slack test to use a secret.
- [ ] Red→green. Commit: `feat: discord/telegram/airtable/notion/openai/set-data/filter connectors (tdd)`.

### Task D2: Registry `connectionType` + field
- [ ] In `lib/steps/registry.ts`: add `connectionType?` to `StepType`; add the new ACTION step types (`discord`,`telegram`,`airtable`,`notion`,`openai`,`set_data`,`filter`) with `fields` (a `{type:'connection'}` field for credentialed ones) + config schemas requiring `connectionId` where applicable; update `slack_message` to `{ connectionId, text }` with `connectionType:'slack'`. Add icons in `components/builder/nodes.tsx` (fallback covers unknowns).
- [ ] `npm run typecheck`. Commit: `feat: register new step types + connection field`.

### Task D3: Engine secret injection + filter stop
- [ ] In `executeRun`: for ACTION nodes whose registry type has `connectionType`, `secret = await getDecryptedSecret(config.connectionId, run.workspaceId)` (StepRun FAILED with clear message if not found); call `getConnector(type)(resolved, ctx, secret)`. After a node, if `node.type==='filter'` and `output.passed===false`, stop the loop.
- [ ] Extend `lib/engine/execute.test.ts`: a `webhook → filter(false) → http` run ends SUCCEEDED with the http step NOT executed; a `webhook → slack(connection)` run decrypts + calls fetch with the connection's webhookUrl (seed a Connection row).
- [ ] Red→green. Commit: `feat: engine resolves connections + filter stop (integration)`.

## Milestone E — Builder connection selector

### Task E1: ConfigPanel connection field
- [ ] Builder page loads `listConnections(workspace.id)`; pass `connections` into `Builder` → `ConfigPanel`. For a field of `type:'connection'`, render a `<select>` of connections where `type === step.connectionType`; empty → hint linking `/app/connections`.
- [ ] `npm run build`. Commit: `feat: connection selector in the builder`.

## Milestone F — Templates

### Task F1: Templates lib (TDD) + gallery + route
- [ ] `lib/templates.ts`: ~8 templates `{key,name,description,category,nodes,edges}`. Test: every template's nodes/edges have exactly one trigger and valid structure (reuse a relaxed check — each non-trigger node reachable; ids unique).
- [ ] `POST /api/workflows/from-template` (`{key}`; MEMBER; `assertCanCreateWorkflow`; regenerate node ids + remap edges; create DRAFT) → `{id}`.
- [ ] `/app/templates/page.tsx` + `TemplatesClient` (gallery by category, "Use template" → POST → route to builder).
- [ ] Add "Templates" to the sidebar (`components/app/Sidebar.tsx`).
- [ ] `npm run build`. Commit: `feat: workflow template gallery + use-template`.

## Milestone G — Verify + docs

### Task G1: E2E + gate
- [ ] `e2e/connections.spec.ts`: sign up → `/app/connections` → add a Slack connection → it lists by name; the page source does not contain the webhook URL value. `/app/templates` → Use a template → lands in builder with nodes.
- [ ] `npm run typecheck && lint && test && build && e2e` green; build verified with no `ENCRYPTION_KEY`.
- [ ] Commit: `test: connections + templates e2e`.

### Task G2: Docs
- [ ] README + `.env.example`: `ENCRYPTION_KEY` (generate: `openssl rand -base64 32`), the connector list, Connections + Templates features. `docs/DEPLOYMENT.md`: add `ENCRYPTION_KEY` to the env step.
- [ ] Commit: `docs: connections, integrations, templates`.

---

## Self-Review notes
- **Spec coverage:** crypto (A) ✓, model+registry+service (B) ✓, crud (C) ✓, connectors+engine (D) ✓, builder (E) ✓, templates (F) ✓, e2e+docs (G) ✓.
- **Build-safe:** `ENCRYPTION_KEY` optional; Connections degrade; verified G1.
- **Type consistency:** `Connector(config,ctx,secret?)`, `getDecryptedSecret(connectionId,workspaceId)`, `connectionType` on StepType, `getConnectionType/listConnectionTypes`.
- **Deferred:** OAuth connections, health checks, rotation, template versioning.
