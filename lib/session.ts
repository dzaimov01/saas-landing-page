import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { db } from './db'

export async function requireUser() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  return session.user
}

export async function getActiveWorkspace(userId: string) {
  const memberships = await db.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: 'asc' },
  })
  if (memberships.length === 0) return null
  const cookieStore = await cookies()
  const preferred = cookieStore.get('ws')?.value
  const chosen = memberships.find((m) => m.workspaceId === preferred) ?? memberships[0]
  return { workspace: chosen.workspace, role: chosen.role, all: memberships }
}
