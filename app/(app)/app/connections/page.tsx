import { EmptyState } from '@/components/app/EmptyState'

export default function ConnectionsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Connections</h1>
      <EmptyState
        title="No connections yet"
        body="Connect Slack, email, and HTTP endpoints in an upcoming release."
      />
    </div>
  )
}
