# Cadence Phase 1 — Workflow Builder Design

**Date:** 2026-06-09
**Status:** Approved
**Depends on:** Phase 0 (foundation) — merged to `main`.

---

## Goal

Let a workspace member visually build, configure, validate, and persist an
automation workflow as a node graph (trigger → actions, with branching
conditions). No execution yet — that is Phase 2.

## Decisions (from brainstorming)

- **Builder UX:** visual drag-and-drop canvas using **React Flow** (`@xyflow/react`).
- **Step types:** schedule + webhook triggers; HTTP request, send email, Slack
  message, delay actions; plus a **condition** node with true/false branches.
- **Storage:** normalized graph tables (not a JSON blob) so Phase 2 execution and
  run logs can reference node IDs.
- **Edit permissions:** any workspace MEMBER can create/edit workflows; OWNER/ADMIN
  can delete.

## Data model (Prisma additions)

```prisma
enum WorkflowStatus { DRAFT ENABLED DISABLED }

model Workflow {
  id          String         @id @default(cuid())
  workspaceId String
  name        String
  status      WorkflowStatus @default(DRAFT)
  createdById String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  workspace   Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  nodes       WorkflowNode[]
  edges       WorkflowEdge[]
}

model WorkflowNode {
  id         String   @id @default(cuid())
  workflowId String
  type       String   // registry key, e.g. "schedule", "http_request", "condition"
  name       String
  config     Json
  positionX  Float
  positionY  Float
  workflow   Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}

model WorkflowEdge {
  id           String   @id @default(cuid())
  workflowId   String
  sourceId     String
  targetId     String
  sourceHandle String?  // null for normal, "true"/"false" for condition branches
  workflow     Workflow @relation(fields: [workflowId], references: [id], onDelete: Cascade)
}
```

`Workspace` gains `workflows Workflow[]`. Node/edge ids are client-generated
(cuid) so React Flow and the DB share the same identifiers; save replaces a
workflow's nodes/edges transactionally.

## Step-type registry (`lib/steps/`)

A typed catalog — the single source of truth for node behaviour.

```ts
type StepKind = 'TRIGGER' | 'ACTION' | 'CONDITION'
type FieldType = 'text' | 'textarea' | 'select' | 'number'
interface FieldDescriptor {
  name: string
  label: string
  type: FieldType
  placeholder?: string
  options?: { value: string; label: string }[]
}
interface StepType {
  key: string
  label: string
  kind: StepKind
  description: string
  configSchema: z.ZodType        // validates config
  defaultConfig: Record<string, unknown>
  fields: FieldDescriptor[]      // drives the generic config form
  handles: { source: string[]; target: boolean } // CONDITION → ['true','false']
}
```

Registered types: `schedule`, `webhook` (TRIGGER); `http_request`, `send_email`,
`slack_message`, `delay` (ACTION); `condition` (CONDITION, source handles
`['true','false']`). Triggers have no target handle; actions have one source +
one target; condition has one target + two sources.

## Validation (`lib/steps/validate.ts`)

`validateWorkflow(nodes, edges)` → `{ errors: string[] }`, pure and unit-tested:

- exactly one TRIGGER node,
- every node's `config` parses against its `configSchema`,
- every CONDITION node has both `true` and `false` outgoing edges,
- no orphan nodes (every non-trigger node reachable from the trigger).

Drafts always save. Setting status to ENABLED requires zero errors (enforced
server-side in the save route).

## Server / API

- `lib/workflows.ts` — workspace-scoped service: `listWorkflows`, `getWorkflow`,
  `createWorkflow`, `saveWorkflow` (name + status + graph replace), `deleteWorkflow`.
  All call `requireWorkspaceRole` (MEMBER to edit, ADMIN to delete).
- Routes:
  - `POST /api/workflows` → create (returns id), redirect to builder.
  - `PUT /api/workflows/[id]` → save name + status + nodes + edges (validates;
    rejects ENABLE when invalid).
  - `DELETE /api/workflows/[id]` → delete (ADMIN+).

## UI

- **`/app` (list):** workflows for the active workspace — name, status badge,
  updated time, open/delete; "New workflow" button (creates a draft, opens
  builder). Empty state when none.
- **`/app/workflows/[id]` (builder):** server component loads the workflow +
  graph and the active membership role, passes to a client `<Builder>`:
  - React Flow canvas with custom node components (trigger/action/condition),
    styled dark/glass.
  - **Palette** to add nodes; drag to position; connect handles to create edges.
  - **Config side-panel**: select a node → schema-driven form (from `fields`) →
    updates node config in canvas state.
  - Top bar: editable name, status select (Draft/Enabled/Disabled), **Save**
    (PUT), inline validation errors, "Back to workflows".
- React Flow styles imported once; `@xyflow/react` is the only new dependency.

## Testing

- **Unit (Vitest):** registry config schemas (valid/invalid per type);
  `validateWorkflow` (trigger count, branch wiring, orphans, bad config);
  `lib/workflows` save logic with a mocked db (graph replace, ENABLE-when-invalid
  rejection).
- **E2E (Playwright):** sign in → New workflow → add a schedule trigger + an HTTP
  action via the palette → configure → Save → return to list → workflow appears →
  reopen → nodes persisted. Palette-click placement (not pixel drag) for
  robustness.

## Out of scope (later phases)

- Execution, run history, real webhook URLs (Phase 2).
- Plan-limit enforcement on workflow count (Phase 3).
- Undo/redo, copy/paste, multi-select on the canvas (future polish).
