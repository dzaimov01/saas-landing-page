import { EmptyState } from '@/components/app/EmptyState'

export default function RunsPage() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Runs</h1>
      <EmptyState
        title="No runs yet"
        body="Run history appears here once the execution engine ships."
      />
    </div>
  )
}
