import { clsx } from 'clsx'

const styles: Record<string, string> = {
  QUEUED: 'bg-white/10 text-muted',
  RUNNING: 'bg-amber-400/15 text-amber-300',
  SUCCEEDED: 'bg-cyan/15 text-cyan',
  FAILED: 'bg-red-400/15 text-red-300',
  PENDING: 'bg-white/10 text-muted',
  SKIPPED: 'bg-white/10 text-muted',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
        styles[status] ?? 'bg-white/10 text-muted',
      )}
    >
      {status.toLowerCase()}
    </span>
  )
}
