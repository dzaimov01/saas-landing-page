import { EmptyState } from '@/components/app/EmptyState'

export default function WorkflowsHome() {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Workflows</h1>
      <EmptyState
        title="No workflows yet"
        body="Workflow building arrives in the next release. Your foundation is ready."
      />
    </div>
  )
}
