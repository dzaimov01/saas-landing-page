import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { Sidebar } from '@/components/app/Sidebar'
import { Topbar } from '@/components/app/Topbar'
import { VerifyBanner } from '@/components/app/VerifyBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  })

  return (
    <div className="min-h-screen">
      {!dbUser?.emailVerified && <VerifyBanner />}
      <Topbar
        memberships={active.all.map((m) => ({
          workspaceId: m.workspaceId,
          workspace: { id: m.workspace.id, name: m.workspace.name },
        }))}
        currentWorkspaceId={active.workspace.id}
        email={user.email ?? ''}
      />
      <div className="flex">
        <Sidebar />
        <main id="main" className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
