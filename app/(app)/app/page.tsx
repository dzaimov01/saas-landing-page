import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { listWorkflows } from '@/lib/workflows'
import { WorkflowList } from '@/components/app/WorkflowList'

export default async function WorkflowsHome() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const workflows = await listWorkflows(active.workspace.id)
  return (
    <WorkflowList
      canDelete={active.role !== 'MEMBER'}
      workflows={workflows.map((w) => ({
        id: w.id,
        name: w.name,
        status: w.status,
        updatedAt: w.updatedAt.toISOString(),
      }))}
    />
  )
}
