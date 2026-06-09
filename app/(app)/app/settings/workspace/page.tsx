import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { WorkspaceForm } from './WorkspaceForm'

export default async function WorkspaceSettings() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-display text-2xl font-bold">Workspace</h1>
      <WorkspaceForm
        workspaceId={active.workspace.id}
        name={active.workspace.name}
        canEdit={active.role !== 'MEMBER'}
      />
    </div>
  )
}
