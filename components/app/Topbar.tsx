import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { UserMenu } from './UserMenu'

type Membership = { workspaceId: string; workspace: { id: string; name: string } }

export function Topbar({
  memberships,
  currentWorkspaceId,
  email,
}: {
  memberships: Membership[]
  currentWorkspaceId: string
  email: string
}) {
  return (
    <header className="flex items-center justify-between border-b border-line px-6 py-3">
      <WorkspaceSwitcher items={memberships} current={currentWorkspaceId} />
      <UserMenu email={email} />
    </header>
  )
}
