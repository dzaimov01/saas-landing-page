import { NextResponse } from 'next/server'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { db } from '@/lib/db'
import { getUsableSecret } from '@/lib/connections'
import { testConnection } from '@/lib/connections/test'

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
  const conn = await db.connection.findFirst({
    where: { id, workspaceId: active.workspace.id },
    select: { type: true },
  })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const secret = await getUsableSecret(id, active.workspace.id)
    if (!secret) return NextResponse.json({ ok: false, message: 'No credentials' })
    const result = await testConnection(conn.type, secret)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ ok: false, message: e instanceof Error ? e.message : 'Failed' })
  }
}
