import { redirect } from 'next/navigation'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { loadWorkspaceAnalytics } from '@/lib/analytics-server'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')

  const { summary, quota } = await loadWorkspaceAnalytics(active.workspace.id)

  return <AnalyticsClient summary={summary} quota={quota} />
}
