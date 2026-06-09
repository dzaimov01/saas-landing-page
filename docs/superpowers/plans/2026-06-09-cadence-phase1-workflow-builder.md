# Cadence Phase 1 — Workflow Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development) to implement task-by-task.

**Goal:** Visually build, configure, validate, and persist automation workflows as a node graph (trigger → actions + branching conditions). No execution (Phase 2).

**Architecture:** React Flow canvas at `/app/workflows/[id]`; normalized `Workflow`/`WorkflowNode`/`WorkflowEdge` tables; a typed step-type registry driving config forms + validation; workspace-scoped, RBAC-guarded API routes.

**Tech Stack:** Next.js 15, Prisma 6, `@xyflow/react`, zod, Vitest, Playwright.

**Reference spec:** `docs/superpowers/specs/2026-06-09-cadence-phase1-workflow-builder-design.md`

**Conventions:** Node 22 (`nvm use`), `npm`, commit per task, run from repo root, local Postgres on `:5433` (from `.env`).

---

## Milestone A — Data model

### Task A1: Prisma models + migration
- [ ] Add `WorkflowStatus` enum + `Workflow`, `WorkflowNode`, `WorkflowEdge` models (see spec) to `prisma/schema.prisma`; add `workflows Workflow[]` to `Workspace`.
- [ ] `npx prisma validate && npx prisma generate` → valid.
- [ ] `npx prisma migrate dev --name workflows` (DATABASE_URL on :5433) → applied.
- [ ] Commit: `feat: workflow graph data model + migration`.

---

## Milestone B — Step registry + validation (TDD)

### Task B1: Registry
**Files:** `lib/steps/types.ts`, `lib/steps/registry.ts`, `lib/steps/registry.test.ts`
- [ ] Define `StepKind`, `FieldType`, `FieldDescriptor`, `StepType` in `types.ts` (see spec).
- [ ] Implement `registry.ts`: a `Record<string, StepType>` `STEP_TYPES` and helpers `getStepType(key)`, `listStepTypes()`. Types:

```ts
// schedule (TRIGGER)
configSchema: z.object({ mode: z.enum(['interval','cron']), value: z.string().min(1) })
fields: [{name:'mode',label:'Mode',type:'select',options:[{value:'interval',label:'Every N minutes'},{value:'cron',label:'Cron expression'}]},
         {name:'value',label:'Value',type:'text',placeholder:'15  or  0 9 * * 1'}]
// webhook (TRIGGER): configSchema z.object({}), fields []
// http_request (ACTION)
z.object({ method: z.enum(['GET','POST','PUT','DELETE']), url: z.string().url(), headers: z.string().optional(), body: z.string().optional() })
// send_email (ACTION): z.object({ to: z.string().email(), subject: z.string().min(1), body: z.string().min(1) })
// slack_message (ACTION): z.object({ channel: z.string().min(1), text: z.string().min(1) })
// delay (ACTION): z.object({ seconds: z.coerce.number().int().positive() })
// condition (CONDITION): z.object({ field: z.string().min(1), operator: z.enum(['eq','neq','contains','gt','lt']), value: z.string() }), handles source ['true','false']
```
Triggers: `handles: { source: ['out'], target: false }`. Actions: `{ source: ['out'], target: true }`. Condition: `{ source: ['true','false'], target: true }`.
- [ ] Write `registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { STEP_TYPES, getStepType, listStepTypes } from './registry'

describe('step registry', () => {
  it('has exactly one trigger marked per trigger key', () => {
    expect(getStepType('schedule').kind).toBe('TRIGGER')
    expect(getStepType('http_request').kind).toBe('ACTION')
    expect(getStepType('condition').handles.source).toEqual(['true', 'false'])
  })
  it('validates good and rejects bad config', () => {
    expect(getStepType('send_email').configSchema.safeParse({ to: 'a@b.com', subject: 'x', body: 'y' }).success).toBe(true)
    expect(getStepType('send_email').configSchema.safeParse({ to: 'nope', subject: '', body: '' }).success).toBe(false)
  })
  it('lists all types', () => {
    expect(listStepTypes().length).toBeGreaterThanOrEqual(7)
  })
})
```
- [ ] `npm test -- registry` fails → implement → passes. Commit: `feat: workflow step-type registry (tdd)`.

### Task B2: Graph validation
**Files:** `lib/steps/validate.ts`, `lib/steps/validate.test.ts`
- [ ] Implement `validateWorkflow(nodes, edges)` where `nodes: {id,type,config}[]`, `edges:{sourceId,targetId,sourceHandle}[]` → `{errors:string[]}`. Rules: exactly one TRIGGER; each config valid; each CONDITION has outgoing `true` and `false` edges; every non-trigger node reachable from the trigger via edges.
- [ ] Test:

```ts
import { describe, it, expect } from 'vitest'
import { validateWorkflow } from './validate'

const trig = { id: 't', type: 'schedule', config: { mode: 'interval', value: '15' } }
const action = { id: 'a', type: 'http_request', config: { method: 'GET', url: 'https://x.com' } }

describe('validateWorkflow', () => {
  it('passes a trigger→action graph', () => {
    expect(validateWorkflow([trig, action], [{ sourceId: 't', targetId: 'a', sourceHandle: null }]).errors).toEqual([])
  })
  it('flags missing trigger', () => {
    expect(validateWorkflow([action], []).errors.join(' ')).toMatch(/trigger/i)
  })
  it('flags two triggers', () => {
    expect(validateWorkflow([trig, { ...trig, id: 't2' }], []).errors.join(' ')).toMatch(/one trigger/i)
  })
  it('flags invalid config', () => {
    expect(validateWorkflow([{ ...trig, config: {} }], []).errors.join(' ')).toMatch(/config/i)
  })
  it('flags condition missing a branch', () => {
    const cond = { id: 'c', type: 'condition', config: { field: 'x', operator: 'eq', value: '1' } }
    const errs = validateWorkflow([trig, cond, action],
      [{ sourceId: 't', targetId: 'c', sourceHandle: null }, { sourceId: 'c', targetId: 'a', sourceHandle: 'true' }]).errors
    expect(errs.join(' ')).toMatch(/false/i)
  })
  it('flags orphan node', () => {
    expect(validateWorkflow([trig, action], []).errors.join(' ')).toMatch(/orphan|reach/i)
  })
})
```
- [ ] Red → green. Commit: `feat: workflow graph validation (tdd)`.

---

## Milestone C — Workflow service + API

### Task C1: Service (TDD where pure)
**Files:** `lib/workflows.ts`, `lib/workflows.test.ts`
- [ ] `listWorkflows(workspaceId)`, `getWorkflow(id, workspaceId)`, `createWorkflow({workspaceId,userId,name})`, `deleteWorkflow(id,workspaceId)`, and `saveWorkflow({id, workspaceId, name, status, nodes, edges})` which: validates when status==='ENABLED' (throws `WorkflowValidationError` with errors), then in a `db.$transaction` deletes existing nodes/edges and recreates from payload, updates name+status.
- [ ] Test `saveWorkflow` rejects ENABLE-when-invalid with a mocked db + `validateWorkflow`:

```ts
import { describe, it, expect, vi } from 'vitest'
const { db } = vi.hoisted(() => ({ db: { $transaction: vi.fn(), workflow: { update: vi.fn() }, workflowNode: { deleteMany: vi.fn(), createMany: vi.fn() }, workflowEdge: { deleteMany: vi.fn(), createMany: vi.fn() } } }))
vi.mock('./db', () => ({ db }))
import { saveWorkflow, WorkflowValidationError } from './workflows'

it('refuses to ENABLE an invalid graph', async () => {
  await expect(saveWorkflow({ id: 'w', workspaceId: 'ws', name: 'x', status: 'ENABLED', nodes: [], edges: [] }))
    .rejects.toBeInstanceOf(WorkflowValidationError)
})
```
- [ ] Red → green. Commit: `feat: workflow service (tdd)`.

### Task C2: API routes
**Files:** `app/api/workflows/route.ts` (POST), `app/api/workflows/[id]/route.ts` (PUT, DELETE)
- [ ] POST: `requireUser` + active workspace + `requireWorkspaceRole(MEMBER)`; create draft; return `{ id }`.
- [ ] PUT: zod-parse `{ name, status, nodes, edges }`; `requireWorkspaceRole(MEMBER)`; call `saveWorkflow`; map `WorkflowValidationError`→422 `{ errors }`.
- [ ] DELETE: `requireWorkspaceRole(ADMIN)`; delete.
- [ ] `npm run typecheck`. Commit: `feat: workflow api routes`.

---

## Milestone D — Workflow list

### Task D1: Replace `/app` with the workflow list
**Files:** `app/(app)/app/page.tsx`, `components/app/WorkflowList.tsx` (client for delete/new)
- [ ] Server page loads `listWorkflows(activeWorkspace.id)`; renders name, status badge, `updatedAt`, link to builder; "New workflow" button posts `/api/workflows` then routes to `/app/workflows/[id]`; empty state when none.
- [ ] `npm run build`. Commit: `feat: workflow list on dashboard`.

---

## Milestone E — Builder canvas

### Task E1: Install React Flow + node components
**Files:** `package.json`, `components/builder/nodes.tsx`
- [ ] `npm install @xyflow/react`.
- [ ] Custom node components (Trigger/Action/Condition) using `Handle` + `Position`; condition renders two source handles (`true`,`false`) with labels; dark/glass styling; show node `name` + type label + a "configure" affordance (selecting handled by canvas).
- [ ] Commit: `chore: react flow + custom node components`.

### Task E2: Builder shell (canvas + palette + save)
**Files:** `app/(app)/app/workflows/[id]/page.tsx` (server loader), `components/builder/Builder.tsx` (client)
- [ ] Server page: load workflow (guard workspace), map nodes→RF nodes (`{id,type,position:{x:positionX,y:positionY},data:{name,config}}`), edges→RF edges (`{id,source:sourceId,target:targetId,sourceHandle}`), pass `canEdit`.
- [ ] `Builder.tsx`: `ReactFlow` with `nodeTypes` from E1; `useNodesState`/`useEdgesState`; `onConnect` adds edge; **Palette** buttons call `addNode(typeKey)` placing a node at a default position with `defaultConfig`; top bar with name input, status `<select>`, **Save** button → PUT `{name,status,nodes,edges}` (map RF→payload), show returned `errors`. Import `@xyflow/react/dist/style.css` in the client component.
- [ ] Commit: `feat: workflow builder canvas + palette + save`.

### Task E3: Config side-panel (schema-driven form)
**Files:** `components/builder/ConfigPanel.tsx`; wire into `Builder.tsx`
- [ ] On node select (`onNodeClick`), open a right panel rendering the selected node type's `fields` as inputs bound to `data.config`; editing updates the node in state; "Done" closes. Disable inputs when `!canEdit`.
- [ ] `npm run build` + `npm run typecheck`. Commit: `feat: builder config side-panel`.

---

## Milestone F — E2E + verification

### Task F1: E2E
**Files:** `e2e/workflows.spec.ts`
- [ ] Helper signs up a fresh user (reuse pattern from `e2e/auth.spec.ts`). Then: click **New workflow** → builder opens → palette: add **Schedule** trigger, add **HTTP request** action → select trigger, set interval value; select action, set URL → connect trigger→action (or auto) → set status **Draft** → **Save** → back to list → workflow row visible → reopen → 2 nodes present (`getByText('HTTP request')`).
- [ ] `npm run e2e` passes.
- [ ] Commit: `test: workflow builder e2e`.

### Task F2: Final gate
- [ ] `npm run typecheck && npm run lint && npm test && npm run build && npm run e2e` all green.
- [ ] Commit any cleanup.

---

## Self-Review notes
- **Spec coverage:** model+migration (A) ✓, registry (B1) ✓, validation (B2) ✓, service+ENABLE-guard (C1) ✓, routes+RBAC (C2) ✓, list (D) ✓, canvas/palette/save (E2) ✓, config panel (E3) ✓, branching condition handles (E1/B) ✓, tests (B,C,F) ✓.
- **Type consistency:** `validateWorkflow(nodes, edges)`, `saveWorkflow({id,workspaceId,name,status,nodes,edges})`, `WorkflowValidationError`, registry `getStepType(key)/listStepTypes()`, node payload `{id,type,name,config,positionX,positionY}`, edge `{sourceId,targetId,sourceHandle}` used consistently.
- **Deferred:** execution/runs (P2), plan limits (P3).
