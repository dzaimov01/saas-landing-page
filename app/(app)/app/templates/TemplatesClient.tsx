'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

type Tpl = { key: string; name: string; description: string; category: string; steps: number }

export function TemplatesClient({ templates }: { templates: Tpl[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const categories = Array.from(new Set(templates.map((t) => t.category)))

  async function use(key: string) {
    setBusy(key)
    setError('')
    const res = await fetch('/api/workflows/from-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    })
    if (res.ok) {
      const { id } = await res.json()
      router.push(`/app/workflows/${id}`)
      return
    }
    const j = await res.json().catch(() => ({}))
    setError(j.error ?? 'Could not create from template.')
    setBusy('')
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Templates</h1>
        <Link href="/app" className="text-sm text-muted hover:text-fog">
          ← Workflows
        </Link>
      </div>
      <p className="mb-8 max-w-2xl text-muted">
        Start from a ready-made workflow, then plug in your connections and details.
      </p>

      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          {error}{' '}
          <Link href="/app/settings/billing" className="underline">
            Upgrade
          </Link>
        </p>
      )}

      {categories.map((cat) => (
        <section key={cat} className="mb-10">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates
              .filter((t) => t.category === cat)
              .map((t) => (
                <div key={t.key} className="flex flex-col rounded-2xl border border-line p-5">
                  <h3 className="font-display text-lg font-bold">{t.name}</h3>
                  <p className="mt-1.5 flex-1 text-sm text-muted">{t.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-muted">{t.steps} steps</span>
                    <Button onClick={() => use(t.key)} disabled={busy === t.key}>
                      {busy === t.key ? 'Creating…' : 'Use template'}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
