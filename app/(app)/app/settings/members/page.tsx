import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { db } from '@/lib/db'
import { MembersClient } from './MembersClient'

export default async function MembersSettings() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const members = await db.membership.findMany({
    where: { workspaceId: active.workspace.id },
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })
  const canManage = active.role !== 'MEMBER'
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Members</h1>
      <MembersClient
        workspaceId={active.workspace.id}
        canManage={canManage}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          email: m.user.email,
          name: m.user.name ?? '',
        }))}
      />
    </div>
  )
}
