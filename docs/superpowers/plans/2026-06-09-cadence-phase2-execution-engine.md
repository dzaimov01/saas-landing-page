# Cadence Phase 2 — Execution Engine & Connectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Run workflows: triggers create runs, a BullMQ worker executes the graph through real connectors with templating, and a run monitor shows results.

**Architecture:** Triggers create `WorkflowRun(QUEUED)` + `enqueueRun`. A standalone BullMQ worker runs `executeRun(runId)`: traverse graph from the trigger, follow condition branches, run action connectors with `{{...}}`-templated config, write `StepRun` rows. Redis via Docker locally / Upstash in prod; worker hosted off-Vercel.

**Tech Stack:** Next.js 15, Prisma 6, BullMQ + ioredis, Redis, zod, Vitest, Playwright, tsx.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase2-execution-engine-design.md`

**Conventions:** Node 22 (`nvm use`), `npm`, commit per task, Postgres on `:5433`, Redis on `:6380` (own container, avoids other projects' `:6379`).

---

## Milestone A — Data model

### Task A1: Run/StepRun models + webhookToken + migration
- [ ] Add `RunStatus`, `StepStatus` enums; `WorkflowRun`, `StepRun` models; `webhookToken String? @unique` + `runs WorkflowRun[]` on `Workflow` (see spec).
- [ ] In `lib/workflows.ts` `createWorkflow`, set `webhookToken: generateToken()` (import from `lib/tokens`).
- [ ] `npx prisma validate && npx prisma generate`; `npx prisma migrate dev --name runs` (DATABASE_URL :5433).
- [ ] Commit: `feat: run/step-run model + webhook tokens + migration`.

---

## Milestone B — Templating + condition (TDD)

### Task B1: Templating `lib/template.ts`
- [ ] Implement `interpolate(value: unknown, ctx: Record<string,unknown>): unknown` — for strings, replace every `{{ path }}` with the dot-path value from ctx (`''` if missing); non-strings returned as-is. `resolveConfig(config, ctx)` maps an object's string fields through `interpolate`.
- [ ] Test `lib/template.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { interpolate, resolveConfig } from './template'
const ctx = { trigger: { body: { email: 'a@b.com' } }, steps: { n1: { status: 200 } } }
describe('interpolate', () => {
  it('replaces a dot path', () => expect(interpolate('to {{trigger.body.email}}', ctx)).toBe('to a@b.com'))
  it('blanks unknown paths', () => expect(interpolate('x{{nope.q}}y', ctx)).toBe('xy'))
  it('passes non-strings through', () => expect(interpolate(5, ctx)).toBe(5))
  it('resolves config object fields', () =>
    expect(resolveConfig({ url: '{{steps.n1.status}}', n: 3 }, ctx)).toEqual({ url: '200', n: 3 }))
})
```
- [ ] Red→green. Commit: `feat: run-context templating (tdd)`.

### Task B2: Condition `lib/engine/condition.ts`
- [ ] `evaluate(config: {field,operator,value}, ctx) → boolean`. `field` is a dot-path resolved from ctx; operators: `eq` (==, string-compared), `neq`, `contains` (string includes), `gt`/`lt` (numeric). Missing field → falsy comparisons.
- [ ] Test `condition.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { evaluate } from './condition'
const ctx = { trigger: { amount: 10, name: 'Ada' }, steps: {} }
it('eq', () => expect(evaluate({ field: 'trigger.name', operator: 'eq', value: 'Ada' }, ctx)).toBe(true))
it('gt', () => expect(evaluate({ field: 'trigger.amount', operator: 'gt', value: '5' }, ctx)).toBe(true))
it('contains', () => expect(evaluate({ field: 'trigger.name', operator: 'contains', value: 'd' }, ctx)).toBe(true))
it('neq false', () => expect(evaluate({ field: 'trigger.name', operator: 'neq', value: 'Ada' }, ctx)).toBe(false))
```
- [ ] Red→green. Commit: `feat: condition evaluation (tdd)`.

---

## Milestone C — Connectors (TDD)

### Task C1: Connector registry + executors `lib/connectors/`
- [ ] `lib/connectors/types.ts`: `type Connector = (config: Record<string,unknown>, ctx: Ctx) => Promise<unknown>`.
- [ ] Implement `http_request` (uses global `fetch`, returns `{status, body}`; body truncated), `send_email` (calls `sendEmail` from `lib/email`), `slack_message` (POST to `config.webhookUrl` if set else dev-log), `delay` (`await` min(seconds,900)*1000 — in tests inject a no-op sleeper).
- [ ] `lib/connectors/index.ts`: `CONNECTORS: Record<string, Connector>` and `getConnector(type)`.
- [ ] Test `lib/connectors/http.test.ts` with mocked `fetch`:
```ts
import { describe, it, expect, vi } from 'vitest'
import { httpRequest } from './http'
it('calls fetch and returns status', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => 'ok' })
  vi.stubGlobal('fetch', fetchMock)
  const out = await httpRequest({ method: 'GET', url: 'https://x.com' }, { trigger: {}, steps: {} })
  expect(fetchMock).toHaveBeenCalledWith('https://x.com', expect.objectContaining({ method: 'GET' }))
  expect(out).toMatchObject({ status: 200 })
})
```
- [ ] Red→green. Commit: `feat: action connectors (http, email, slack, delay) (tdd)`.

---

## Milestone D — Engine

### Task D1: Graph traversal planner `lib/engine/plan.ts` (TDD)
- [ ] `nextNodeIds(currentId, nodes, edges, branch?: 'true'|'false')` → the target id(s) to run next: for a condition, the edge whose `sourceHandle` matches `branch`; otherwise edges from `currentId`. Returns first match (single-path V1).
- [ ] Test with a trigger→condition→(true:a / false:b) fixture asserting branch selection.
- [ ] Red→green. Commit: `feat: graph traversal planner (tdd)`.

### Task D2: `executeRun` `lib/engine/execute.ts`
- [ ] `executeRun(runId)`: load run + workflow (nodes/edges) via `db`; set RUNNING/startedAt; build ctx `{ trigger: run.trigger, steps: {} }`; start at the trigger node; loop (max 100 steps, visited guard):
  - write a `StepRun` RUNNING for the node;
  - TRIGGER: record output = trigger; advance via its single out edge;
  - CONDITION: `evaluate`; record; advance via matching branch edge;
  - ACTION: `resolveConfig(config, ctx)` → `getConnector(type)(config, ctx)` → store output in `ctx.steps[nodeId]`; record SUCCEEDED; advance via out edge; on throw → StepRun FAILED, run FAILED, stop;
  - no next node → finish.
  - set run SUCCEEDED/finishedAt (or FAILED).
- [ ] Integration test `lib/engine/execute.test.ts` (real test Postgres via `.env` :5433; mock `fetch`): seed a workflow (webhook trigger → http_request `{ url: 'https://api/{{trigger.body.id}}' }`) + a run, call `executeRun`, assert run SUCCEEDED, 2 StepRuns, fetch called with `https://api/42`.
- [ ] Red→green. Commit: `feat: workflow execution engine (integration-tested)`.

---

## Milestone E — Queue, worker, triggers

### Task E1: Queue `lib/queue.ts`
- [ ] BullMQ `Queue('runs')` with ioredis connection from `env.REDIS_URL`; add `REDIS_URL: z.string().optional()` to `lib/env.ts`. Helpers: `enqueueRun(runId)` (adds `{type:'run',runId}`), `upsertSchedule(workflow)` (adds repeatable job from a schedule trigger's cron/interval, jobId `schedule:<id>`), `removeSchedule(workflowId)`. Throw a clear error if `REDIS_URL` unset when used.
- [ ] Commit: `feat: bullmq runs queue + schedule helpers`.

### Task E2: Worker `worker/index.ts` + script
- [ ] BullMQ `Worker('runs')` processor: `type:'run'` → `executeRun(runId)`; `type:'schedule'` → create a `WorkflowRun` for the workflow + `executeRun`. Concurrency 5, attempts 3 backoff. Add `"worker": "tsx worker/index.ts"` to scripts; add `tsx` dev dep.
- [ ] Commit: `feat: bullmq worker process`.

### Task E3: Trigger endpoints
- [ ] `app/api/hooks/[token]/route.ts` POST: find ENABLED workflow by `webhookToken` with a webhook trigger → create run(trigger=body) → `enqueueRun` → `{ runId }`. 404 otherwise.
- [ ] `app/api/workflows/[id]/run/route.ts` POST (auth + MEMBER): create run(trigger={manual:true}) → `enqueueRun` → `{ runId }`.
- [ ] On `saveWorkflow`: if status ENABLED + has a schedule trigger → `upsertSchedule`; else `removeSchedule`. (Guard so missing Redis only warns, doesn't break save.)
- [ ] `npm run typecheck`. Commit: `feat: webhook + run-now endpoints, schedule registration`.

---

## Milestone F — Run monitor UI

### Task F1: Runs list + detail
- [ ] `app/(app)/app/runs/page.tsx` — `listRuns(workspaceId)` (newest first, include workflow name); render status badge, started, duration; empty state. `lib/runs.ts` service: `listRuns`, `getRun(id, workspaceId)`.
- [ ] `app/(app)/app/runs/[id]/page.tsx` — run header + ordered `StepRun`s (status, output/error, timings).
- [ ] Commit: `feat: run monitor (list + detail)`.

### Task F2: Builder Run-now + webhook URL
- [ ] In `components/builder/Builder.tsx`: a **Run now** button → `POST /api/workflows/[id]/run` → on success route to `/app/runs/<id>`.
- [ ] In `ConfigPanel`, when the node is a `webhook` trigger, show the webhook URL `"{APP_URL}/api/hooks/{token}"` (pass `webhookToken` into Builder/page) with copy.
- [ ] `npm run build`. Commit: `feat: run-now + webhook URL in builder`.

---

## Milestone G — E2E + verification

### Task G1: Redis + worker test harness
- [ ] Add `e2e/global-setup.ts` (Playwright `globalSetup`) that spawns `npm run worker` as a child process (env: DATABASE_URL :5433, REDIS_URL :6380) and waits ~1s; teardown kills it. Wire `globalSetup` + pass `REDIS_URL`/`WORKER` into `playwright.config.ts` `webServer.env`.
- [ ] Ensure Redis container is documented; the run command starts `cadence-redis` on 6380.
- [ ] Commit: `test: playwright worker/redis harness`.

### Task G2: Engine E2E
- [ ] `e2e/runs.spec.ts`: sign up → New workflow → add **Webhook** trigger + **Delay** action (set 1s) → connect → status **Enabled** → Save (reads webhook token from the page) → `POST` the webhook URL via `request` fixture → open `/app/runs` → poll until row shows **Succeeded** (timeout 20s) → open detail → both steps **Succeeded**.
- [ ] `npm run e2e` passes (worker running via global-setup; Redis up).
- [ ] Commit: `test: execution engine e2e (webhook→delay→succeeded)`.

### Task G3: Final gate + docs
- [ ] `npm run typecheck && lint && test && build && e2e` green.
- [ ] README: add Redis + worker to local setup, `REDIS_URL` to env, and a "Running the engine" section (start Redis, `npm run worker`); note prod worker hosting + Upstash. Update `.env.example` with `REDIS_URL`.
- [ ] Commit: `docs: engine setup + env`.

---

## Self-Review notes
- **Spec coverage:** model+webhookToken (A) ✓, templating (B1) ✓, condition (B2) ✓, connectors (C1) ✓, planner (D1) ✓, executeRun+integration (D2) ✓, queue (E1) ✓, worker (E2) ✓, webhook/run-now/schedule (E3) ✓, run monitor (F1) ✓, run-now/webhook URL (F2) ✓, redis+worker e2e (G1–G2) ✓, docs/env (G3) ✓.
- **Type consistency:** `executeRun(runId)`, `interpolate(value,ctx)`/`resolveConfig(config,ctx)`, `evaluate(config,ctx)`, `getConnector(type)`, `enqueueRun(runId)`/`upsertSchedule(workflow)`/`removeSchedule(id)`, ctx `{ trigger, steps }`.
- **Deferred:** quota enforcement (P3), OAuth Slack, fan-out, cancellation.
