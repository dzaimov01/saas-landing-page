import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'

const Body = z.object({
  workspaceId: z.string(),
  membershipId: z.string(),
  action: z.enum(['setRole', 'remove']),
  role: z.enum(['ADMIN', 'MEMBER']).optional(),
})

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  const { workspaceId, membershipId, action, role } = parsed.data
  try {
    await requireWorkspaceRole(user.id, workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const target = await db.membership.findUnique({ where: { id: membershipId } })
  if (!target || target.workspaceId !== workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot modify the owner.' }, { status: 400 })
  }

  if (action === 'remove') {
    await db.membership.delete({ where: { id: membershipId } })
  } else {
    await db.membership.update({ where: { id: membershipId }, data: { role: role ?? 'MEMBER' } })
  }
  return NextResponse.json({ ok: true })
}
