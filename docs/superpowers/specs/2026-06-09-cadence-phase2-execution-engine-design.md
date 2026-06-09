# Cadence Phase 2 — Execution Engine & Connectors Design

**Date:** 2026-06-09
**Status:** Approved
**Depends on:** Phase 0 (foundation) + Phase 1 (workflow builder), merged to `main`.

---

## Goal

Make workflows actually run: triggers create runs, a worker executes the graph
step-by-step through real connectors, and users watch runs in a monitor.

## Decisions (from brainstorming)

- **Engine:** Redis-backed **BullMQ** queue + a standalone **worker** process.
- **Data passing:** lightweight `{{...}}` templating from a run context.
- **Honest deployment note:** the BullMQ worker is a long-running process Vercel
  cannot host. Production runs it on a separate always-on host (Railway/Render/Fly/
  a VM) with a managed Redis (Upstash). Locally: Docker Redis + `npm run worker`.

## Architecture

```
trigger ─→ create WorkflowRun(QUEUED) ─→ enqueueRun(runId) ──▶ BullMQ "runs" queue
                                                                      │
                                                            worker/index.ts (Worker)
                                                                      │
                                                            executeRun(runId)
                                                       ├─ build context {trigger, steps}
                                                       ├─ traverse graph from trigger
                                                       ├─ condition → follow true/false
                                                       ├─ action → connector(config,ctx)
                                                       └─ write StepRun rows; set run status
```

### Triggers
- **Webhook:** `Workflow.webhookToken` (unique, generated on create). `POST
  /api/hooks/[token]` → create run with the JSON body as trigger payload →
  `enqueueRun`.
- **Schedule:** on ENABLE of a scheduled workflow, register a BullMQ **repeatable
  job** (cron or interval) keyed by `schedule:<workflowId>`; on DISABLE/DELETE,
  remove it. The worker's scheduled processor creates + enqueues a run.
- **Run now:** auth-guarded `POST /api/workflows/[id]/run` enqueues a manual run.

### Engine (`lib/engine/`)
- `executeRun(runId)` — the tested heart, callable directly (not only via queue):
  - load workflow graph + create context `{ trigger: payload, steps: {} }`,
  - start at the single TRIGGER node; follow outgoing edges,
  - **condition** node: evaluate `field/operator/value` against context →
    follow the `true` or `false` edge only,
  - **action** node: resolve templated config, call the connector, store output
    in `context.steps[nodeId]`,
  - write a `StepRun` per executed node (status/input/output/error/timings),
  - set run RUNNING→SUCCEEDED, or FAILED on the first unrecoverable error.
- Traversal follows a **single path** (one outgoing edge per non-condition node;
  condition picks one branch). Cycles guarded by a visited set + max-steps cap.
- **Templating (`lib/template.ts`):** `interpolate(value, context)` replaces
  `{{path.to.value}}` using dot-paths into `{ trigger, steps }`. Non-string
  config values pass through. Unit-tested.
- **Condition (`lib/engine/condition.ts`):** `evaluate(config, context) → boolean`
  for operators `eq|neq|contains|gt|lt`. Unit-tested.

### Connectors (`lib/connectors/`)
One executor `run(config, context) → output` per action type:
- `http_request` — real `fetch`; returns `{ status, body }`.
- `send_email` — Resend; dev-fallback logs when no `RESEND_API_KEY`.
- `slack_message` — POST to a Slack incoming-webhook URL from config; dev-fallback
  logs when none.
- `delay` — `await` `seconds` (capped at 900s on the worker).
- `condition` is handled by the traverser, not a connector.
A `CONNECTORS` registry maps action type → executor; unknown/disabled types fail
the step with a clear error.

### Data model (Prisma additions)
```prisma
enum RunStatus { QUEUED RUNNING SUCCEEDED FAILED }
enum StepStatus { PENDING RUNNING SUCCEEDED FAILED SKIPPED }

model Workflow { ... webhookToken String? @unique ... runs WorkflowRun[] }

model WorkflowRun {
  id          String    @id @default(cuid())
  workflowId  String
  workspaceId String
  status      RunStatus @default(QUEUED)
  trigger     Json
  error       String?
  startedAt   DateTime?
  finishedAt  DateTime?
  createdAt   DateTime  @default(now())
  workflow    Workflow  @relation(fields: [workflowId], references: [id], onDelete: Cascade)
  steps       StepRun[]
  @@index([workspaceId]) @@index([workflowId])
}

model StepRun {
  id         String     @id @default(cuid())
  runId      String
  nodeId     String
  type       String
  status     StepStatus @default(PENDING)
  input      Json?
  output     Json?
  error      String?
  startedAt  DateTime?
  finishedAt DateTime?
  run        WorkflowRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  @@index([runId])
}
```
`webhookToken` is generated for every workflow on creation (Phase 1 route
updated). Run counts per workspace are recorded (rows) for Phase 3 quota
enforcement; not enforced here.

### Queue + worker
- `lib/queue.ts` — a singleton BullMQ `Queue('runs')` + connection from
  `REDIS_URL`; helpers `enqueueRun(runId)`, `upsertSchedule(workflow)`,
  `removeSchedule(workflowId)`. Guarded so importing it without Redis in
  pure-unit tests is avoided (queue used only by routes/worker).
- `worker/index.ts` — a BullMQ `Worker('runs')` whose processor distinguishes
  `{ type: 'run', runId }` and `{ type: 'schedule', workflowId }` jobs, calling
  `executeRun` / creating a scheduled run. Run via `npm run worker` (`tsx`).

### Security
- Webhook endpoint is public but unguessable by `webhookToken`; only ENABLED
  workflows with a webhook trigger accept posts.
- `run`/builder endpoints stay auth + RBAC guarded (members can run).
- `REDIS_URL` added to env schema (optional; engine features require it).

## UI
- **`/app/runs`** — runs for the active workspace: workflow name, status badge,
  started, duration; link to detail. Empty state otherwise.
- **`/app/runs/[id]`** — ordered `StepRun`s with status, output/error, timings;
  run-level status + error.
- **Builder** — a **Run now** button (enqueue + toast) and, for webhook triggers,
  the webhook URL shown in the config panel (copyable).

## Testing
- **Unit (Vitest):** `interpolate` templating; condition `evaluate`; each
  connector with mocked `fetch`/email; the traversal planner (which node runs next
  given a condition result).
- **Integration (Vitest, real test Postgres, mocked `fetch`):** build a
  `webhook → http_request(templated) → done` workflow, run `executeRun()`, assert
  run SUCCEEDED, two `StepRun`s, and the connector received the interpolated URL.
- **E2E (Playwright, real Redis + worker spawned in global-setup):** create +
  enable a `webhook → delay(1s)` workflow, `POST` its webhook URL, poll
  `/app/runs` until the run shows **Succeeded** — proving trigger→queue→worker→
  monitor end to end. If the worker-in-test proves flaky, the integration test is
  the authoritative engine proof and E2E asserts the run reaches the monitor
  (QUEUED/RUNNING) instead.

## Out of scope (later phases)
- Plan-limit / run-quota **enforcement** (Phase 3 — counts recorded here).
- Slack OAuth, parallel branch fan-out, per-step manual retry UI, run cancellation.
