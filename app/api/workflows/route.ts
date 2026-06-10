import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { createWorkflow } from '@/lib/workflows'
import { assertCanCreateWorkflow, PlanLimitError } from '@/lib/billing'

export async function POST() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  try {
    await assertCanCreateWorkflow(active.workspace.id)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 402 })
    }
    throw e
  }
  const wf = await createWorkflow({
    workspaceId: active.workspace.id,
    userId: user.id,
    name: 'Untitled workflow',
  })
  return NextResponse.json({ id: wf.id }, { status: 201 })
}
