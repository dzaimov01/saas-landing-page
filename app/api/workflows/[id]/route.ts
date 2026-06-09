import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { getWorkflow, saveWorkflow, deleteWorkflow, WorkflowValidationError } from '@/lib/workflows'

const NodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  config: z.unknown(),
  positionX: z.number(),
  positionY: z.number(),
})
const EdgeSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  sourceHandle: z.string().nullable(),
})
const Body = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(['DRAFT', 'ENABLED', 'DISABLED']),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
})

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const existing = await getWorkflow(id, active.workspace.id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  try {
    await saveWorkflow({ id, workspaceId: active.workspace.id, ...parsed.data })
  } catch (e) {
    if (e instanceof WorkflowValidationError) {
      return NextResponse.json({ errors: e.errors }, { status: 422 })
    }
    throw e
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  await deleteWorkflow(id, active.workspace.id)
  return NextResponse.json({ ok: true })
}
