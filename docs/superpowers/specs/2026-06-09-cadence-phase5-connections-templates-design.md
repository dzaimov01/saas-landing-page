# Cadence Phase 5 — Connections, Integrations & Template Library Design

**Date:** 2026-06-09
**Status:** Approved
**Depends on:** Phases 0–4, merged to `main`.

---

## Goal

Make Cadence feel like an integrations platform: reusable encrypted **Connections**,
more real connectors, and a gallery of ready-to-go workflow **templates**.

## Decisions (from brainstorming)

- Credentials stored as reusable **Connections** (encrypted at rest), referenced by steps.
- New connectors: Discord, Telegram, Airtable, Notion, OpenAI, plus utility Set-data
  and Filter. Existing Slack migrates onto the Connections model.
- Templates surfaced in a dedicated **`/app/templates`** gallery; "Use template" clones
  into the workspace.

## 1. Connections (encrypted credential store)

### Crypto (`lib/crypto.ts`)
- AES-256-GCM. Key from `ENCRYPTION_KEY` (base64 of 32 bytes). `encrypt(plaintext) →
  "iv.tag.ciphertext"` (base64 parts); `decrypt(blob) → plaintext`. `encryptionEnabled()`
  = key present and 32 bytes. Throws a clear error if used while disabled. Unit-tested
  round-trip + tamper-detection.

### Data model (Prisma)
```prisma
model Connection {
  id          String    @id @default(cuid())
  workspaceId String
  type        String    // slack | discord | telegram | airtable | notion | openai
  name        String
  secret      String    // AES-GCM-encrypted JSON of credential fields
  createdAt   DateTime  @default(now())
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  @@index([workspaceId])
}
```
`Workspace` gains `connections Connection[]`.

### Connection-type registry (`lib/connections/registry.ts`)
Each type declares credential fields:
- `slack`, `discord` → `{ webhookUrl }`
- `telegram` → `{ botToken }`
- `airtable`, `openai` → `{ apiKey }`
- `notion` → `{ token }`
Drives the create form. `getConnectionType(type)`, `listConnectionTypes()`.

### Service + API (`lib/connections.ts`)
- `listConnections(workspaceId)` → id/type/name only (no secret).
- `createConnection({workspaceId, type, name, fields})` → encrypts `fields` JSON.
- `deleteConnection(id, workspaceId)`.
- `getDecryptedSecret(connectionId, workspaceId)` → parsed credential object (server-only).
- Routes: `POST /api/connections` (MEMBER), `DELETE /api/connections/[id]` (MEMBER).
  Secrets never serialized to the client.

### UI (`/app/connections`)
Replaces the placeholder: list connections (type + name), "Add connection" (pick type
→ fill fields), delete. "Connections aren't available" note when `!encryptionEnabled()`.

## 2. Connectors

`Connector = (config, ctx, secret?) => Promise<unknown>`. The engine resolves a step's
`connectionId` → decrypted secret and passes it as `secret`.

New executors (`lib/connectors/`):
- **discord** — POST `secret.webhookUrl` `{ content: config.content }`.
- **telegram** — POST `https://api.telegram.org/bot{secret.botToken}/sendMessage`
  `{ chat_id: config.chatId, text: config.text }`.
- **airtable** — POST `https://api.airtable.com/v0/{config.baseId}/{config.table}` with
  `Authorization: Bearer {secret.apiKey}`, body `{ fields: JSON.parse(config.fields) }`.
- **notion** — POST `https://api.notion.com/v1/pages` with `Authorization: Bearer
  {secret.token}`, `Notion-Version: 2022-06-28`, body creating a page in
  `config.databaseId` with a title `config.title`.
- **openai** — POST `https://api.openai.com/v1/chat/completions` with
  `Authorization: Bearer {secret.apiKey}`, `{ model: config.model, messages:[{role:'user',
  content: config.prompt}] }`; returns `{ text }` (first choice) into the context.
- **set_data** — parses `config.json` (object) and returns it (available as
  `{{steps.<id>.<key>}}`). No secret.
- **filter** — evaluates a condition (`field/operator/value`) against ctx; returns
  `{ passed }`. No secret. When `passed === false`, the engine **stops** the run
  (still SUCCEEDED).
- **slack** — migrated: reads `secret.webhookUrl`; config is `{ connectionId, text }`.

Registry (`lib/steps/registry.ts`) gains `connectionType?: string` on credentialed
steps; their config schemas require `connectionId` (min 1). Field type `'connection'`
renders the connection selector.

### Engine (`lib/engine/execute.ts`)
Before an ACTION runs: if its step type has a `connectionType`, resolve
`config.connectionId` → `getDecryptedSecret` (fail the step with a clear error if
missing). Pass `secret` to the connector. After a `filter` step, if `output.passed`
is false, stop traversal.

## 3. Builder integration

- Step registry field type `'connection'`: `ConfigPanel` renders a `<select>` of the
  workspace's connections whose `type === step.connectionType` (passed into the Builder
  from the builder page, which loads `listConnections`). Empty → a hint linking to
  `/app/connections`.
- `validateWorkflow` already enforces config schemas, so a missing `connectionId` blocks
  ENABLE.

## 4. Templates

- `lib/templates.ts`: array of `{ key, name, description, category, nodes, edges }`.
  Nodes use registry types; credentialed nodes have `connectionId: ''` (configured after
  cloning). Each template passes `validateWorkflow` structurally (ignoring the empty
  connectionId, which only blocks ENABLE, not save-as-draft).
- `/app/templates`: gallery grouped by category; **Use template** → `POST
  /api/workflows/from-template { key }` → `assertCanCreateWorkflow`, create a workflow
  with regenerated node ids (+ remapped edges), status DRAFT → redirect to the builder.
- ~8 templates spanning the connectors.

## Testing
- **Unit:** crypto round-trip + tamper; connection-type registry; new connector
  executors (mocked `fetch`, injected secret); `lib/templates` each passes structural
  `validateWorkflow`; engine injects a decrypted secret + filter-stop (integration).
- **E2E:** create a Connection (Slack) → appears in `/app/connections`, secret not in
  the DOM/response; `/app/templates` → Use template → workflow created and opens in the
  builder; the builder's Slack step shows the connection selector.
- Build green with **no** `ENCRYPTION_KEY` (Connections degrade; app builds).

## Out of scope
- OAuth connections (Google Sheets, HubSpot, etc.), connection health checks, secret
  rotation UI, per-connection rate limits, template versioning.
