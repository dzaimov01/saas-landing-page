'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'

type Item = { id: string; name: string; status: 'DRAFT' | 'ENABLED' | 'DISABLED'; updatedAt: string }

const badge: Record<Item['status'], string> = {
  DRAFT: 'bg-white/10 text-muted',
  ENABLED: 'bg-cyan/15 text-cyan',
  DISABLED: 'bg-white/10 text-muted',
}

export function WorkflowList({ workflows, canDelete }: { workflows: Item[]; canDelete: boolean }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)

  async function create() {
    setCreating(true)
    const res = await fetch('/api/workflows', { method: 'POST' })
    if (res.ok) {
      const { id } = await res.json()
      router.push(`/app/workflows/${id}`)
    } else {
      setCreating(false)
    }
  }

  async function remove(id: string) {
    await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Workflows</h1>
        <Button onClick={create} disabled={creating}>
          {creating ? 'Creating…' : 'New workflow'}
        </Button>
      </div>

      {workflows.length === 0 ? (
        <div className="rounded-2xl border border-line p-12 text-center">
          <h2 className="font-display text-xl font-bold">No workflows yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Create your first automation — pick a trigger, add actions, and connect them on the
            canvas.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {workflows.map((w) => (
            <li key={w.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <Link href={`/app/workflows/${w.id}`} className="font-medium hover:text-cyan">
                  {w.name}
                </Link>
                <span
                  className={clsx(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    badge[w.status],
                  )}
                >
                  {w.status.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted">
                <span>{new Date(w.updatedAt).toLocaleDateString()}</span>
                <Link href={`/app/workflows/${w.id}`} className="text-cyan">
                  Open
                </Link>
                {canDelete && (
                  <button onClick={() => remove(w.id)} className="text-red-400">
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
