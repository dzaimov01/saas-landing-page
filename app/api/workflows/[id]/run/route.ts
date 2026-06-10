import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { getWorkflow } from '@/lib/workflows'
import { enqueueRun } from '@/lib/queue'
import { assertWithinRunQuota, PlanLimitError } from '@/lib/billing'

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
  const workflow = await getWorkflow(id, active.workspace.id)
  if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await assertWithinRunQuota(active.workspace.id)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 402 })
    }
    throw e
  }

  const run = await db.workflowRun.create({
    data: {
      workflowId: workflow.id,
      workspaceId: active.workspace.id,
      status: 'QUEUED',
      trigger: { manual: true },
    },
  })
  try {
    await enqueueRun(run.id)
  } catch {
    return NextResponse.json({ error: 'Execution engine unavailable' }, { status: 503 })
  }
  return NextResponse.json({ runId: run.id }, { status: 202 })
}
