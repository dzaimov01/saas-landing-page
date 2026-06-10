import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { listRuns } from '@/lib/runs'
import { StatusBadge } from '@/components/app/StatusBadge'

function duration(start: Date | null, end: Date | null): string {
  if (!start || !end) return '—'
  const ms = end.getTime() - start.getTime()
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export default async function RunsPage() {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const runs = await listRuns(active.workspace.id)

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Runs</h1>
      {runs.length === 0 ? (
        <div className="rounded-2xl border border-line p-12 text-center">
          <h2 className="font-display text-xl font-bold">No runs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Enable a workflow and trigger it (webhook, schedule, or “Run now”) to see runs here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/app/runs/${r.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span className="font-medium">{r.workflow.name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-muted">
                  <span>{duration(r.startedAt, r.finishedAt)}</span>
                  <span>{new Date(r.createdAt).toLocaleString()}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
