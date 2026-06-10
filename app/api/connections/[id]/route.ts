import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { deleteConnection } from '@/lib/connections'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
  await deleteConnection(id, active.workspace.id)
  return NextResponse.json({ ok: true })
}
