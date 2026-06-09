import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { slugify } from '@/lib/slug'

const Body = z.object({ workspaceId: z.string(), name: z.string().min(1).max(80) })

export async function POST(req: Request) {
  const user = await requireUser()
  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, parsed.data.workspaceId, 'ADMIN')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }
  let slug = slugify(parsed.data.name)
  while (await db.workspace.findFirst({ where: { slug, NOT: { id: parsed.data.workspaceId } } })) {
    slug = slugify(parsed.data.name, { withSuffix: true })
  }
  await db.workspace.update({
    where: { id: parsed.data.workspaceId },
    data: { name: parsed.data.name, slug },
  })
  return NextResponse.json({ ok: true })
}
