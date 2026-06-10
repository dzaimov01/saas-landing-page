import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { getRun } from '@/lib/runs'
import { getStepType } from '@/lib/steps/registry'
import { StatusBadge } from '@/components/app/StatusBadge'

function label(type: string): string {
  try {
    return getStepType(type).label
  } catch {
    return type
  }
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const run = await getRun(id, active.workspace.id)
  if (!run) notFound()

  return (
    <div className="max-w-2xl">
      <Link href="/app/runs" className="text-sm text-muted hover:text-fog">
        ← Runs
      </Link>
      <div className="mt-3 mb-6 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold">{run.workflow.name}</h1>
        <StatusBadge status={run.status} />
      </div>
      {run.error && (
        <p role="alert" className="mb-6 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
          {run.error}
        </p>
      )}

      <ol className="space-y-3">
        {run.steps.map((s) => (
          <li key={s.id} className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{label(s.type)}</span>
              <StatusBadge status={s.status} />
            </div>
            {s.error && <p className="mt-2 text-sm text-red-300">{s.error}</p>}
            {s.output != null && (
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 text-xs text-muted">
                {JSON.stringify(s.output, null, 2)}
              </pre>
            )}
          </li>
        ))}
        {run.steps.length === 0 && <p className="text-muted">No steps recorded.</p>}
      </ol>
    </div>
  )
}
