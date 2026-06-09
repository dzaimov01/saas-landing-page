import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'

const Body = z.object({ workspaceId: z.string() })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, parsed.data.workspaceId, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set('ws', parsed.data.workspaceId, { httpOnly: true, sameSite: 'lax', path: '/' })
  return res
}
