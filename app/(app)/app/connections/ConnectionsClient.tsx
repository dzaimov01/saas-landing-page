'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

type Field = { name: string; label: string; placeholder?: string }
type ConnType = { type: string; label: string; fields: Field[] }
type Conn = { id: string; type: string; name: string }

export function ConnectionsClient({
  enabled,
  types,
  connections,
}: {
  enabled: boolean
  types: ConnType[]
  connections: Conn[]
}) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [type, setType] = useState(types[0]?.type ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selected = types.find((t) => t.type === type)
  const labelFor = (t: string) => types.find((x) => x.type === t)?.label ?? t

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const form = new FormData(e.currentTarget)
    const fields: Record<string, string> = {}
    for (const f of selected?.fields ?? []) fields[f.name] = String(form.get(f.name) ?? '')
    const res = await fetch('/api/connections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, name: String(form.get('name')), fields }),
    })
    setBusy(false)
    if (res.ok) {
      setAdding(false)
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Could not save the connection.')
    }
  }

  async function remove(id: string) {
    await fetch(`/api/connections/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Connections</h1>
        {enabled && !adding && <Button onClick={() => setAdding(true)}>Add connection</Button>}
      </div>

      {!enabled ? (
        <p className="rounded-2xl border border-line p-5 text-sm text-muted">
          Connections aren&apos;t available yet. Set <code className="text-cyan">ENCRYPTION_KEY</code>{' '}
          (a base64 of 32 random bytes) to store credentials securely.
        </p>
      ) : (
        <>
          {adding && (
            <form onSubmit={submit} className="mb-6 space-y-4 rounded-2xl border border-line p-5">
              <div>
                <Label htmlFor="type">Service</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
                >
                  {types.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder={`My ${selected?.label}`} required />
              </div>
              {selected?.fields.map((f) => (
                <div key={f.name}>
                  <Label htmlFor={f.name}>{f.label}</Label>
                  <Input id={f.name} name={f.name} placeholder={f.placeholder} required />
                </div>
              ))}
              {error && (
                <p role="alert" className="text-sm text-red-300">
                  {error}
                </p>
              )}
              <div className="flex gap-3">
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Save connection'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {connections.length === 0 && !adding ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <h2 className="font-display text-xl font-bold">No connections yet</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                Add a Slack, Discord, OpenAI, or other credential once and reuse it across workflows.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {connections.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-4">
                  <span>
                    <span className="font-medium">{c.name}</span>{' '}
                    <span className="text-sm text-muted">· {labelFor(c.type)}</span>
                  </span>
                  <button onClick={() => remove(c.id)} className="text-sm text-red-400">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
