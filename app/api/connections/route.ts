import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { createConnection } from '@/lib/connections'
import { getConnectionType } from '@/lib/connections/registry'
import { encryptionEnabled } from '@/lib/crypto'

const Body = z.object({
  type: z.string().min(1),
  name: z.string().min(1).max(80),
  fields: z.record(z.string(), z.unknown()),
})

export async function POST(req: Request) {
  if (!encryptionEnabled()) {
    return NextResponse.json({ error: 'Connections are not configured (ENCRYPTION_KEY missing).' }, { status: 400 })
  }
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  try {
    if (getConnectionType(parsed.data.type).auth === 'oauth') {
      return NextResponse.json(
        { error: 'Use the Connect button for this integration.' },
        { status: 400 },
      )
    }
  } catch {
    return NextResponse.json({ error: 'Unknown connection type' }, { status: 400 })
  }

  try {
    const conn = await createConnection({ workspaceId: active.workspace.id, ...parsed.data })
    return NextResponse.json({ id: conn.id }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 })
  }
}
