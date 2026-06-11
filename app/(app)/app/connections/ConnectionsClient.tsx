'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

type Field = { name: string; label: string; placeholder?: string }
type ConnType = {
  type: string
  label: string
  fields: Field[]
  auth: 'apikey' | 'oauth'
  provider: string | null
}
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
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  // Read ?connected= / ?error= from the OAuth callback redirect once on mount,
  // then strip the query so a refresh doesn't re-show the banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('connected')
    const failed = params.get('error') === 'oauth'
    if (!connected && !failed) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of callback query params
    setBanner(
      connected
        ? { kind: 'ok', text: 'Connected successfully.' }
        : { kind: 'err', text: 'Could not connect. Please try again.' },
    )
    window.history.replaceState({}, '', '/app/connections')
    if (connected) router.refresh()
  }, [router])

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

  async function test(id: string) {
    setTestResult((r) => ({ ...r, [id]: 'Testing…' }))
    const res = await fetch(`/api/connections/${id}/test`, { method: 'POST' })
    const j = await res.json().catch(() => ({ ok: false, message: 'Error' }))
    setTestResult((r) => ({ ...r, [id]: j.ok ? `✓ ${j.message}` : `✗ ${j.message}` }))
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Connections</h1>
        {enabled && !adding && <Button onClick={() => setAdding(true)}>Add connection</Button>}
      </div>

      {banner && (
        <p
          role="status"
          className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
            banner.kind === 'ok'
              ? 'border-emerald-500/30 text-emerald-300'
              : 'border-red-500/30 text-red-300'
          }`}
        >
          {banner.text}
        </p>
      )}

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

              {selected?.auth === 'oauth' ? (
                <div className="flex gap-3">
                  <a
                    href={`/api/connections/oauth/${selected.provider}/start`}
                    className="inline-flex items-center justify-center rounded-lg bg-fog px-4 py-2.5 text-sm font-semibold text-ink hover:opacity-90"
                  >
                    Connect with {selected.label}
                  </a>
                  <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
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
                </>
              )}
            </form>
          )}

          {connections.length === 0 && !adding ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <h2 className="font-display text-xl font-bold">No connections yet</h2>
              <p className="mx-auto mt-2 max-w-md text-muted">
                Add a Slack, Discord, OpenAI, Google Sheets, or other credential once and reuse it
                across workflows.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {connections.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-4">
                  <span>
                    <span className="font-medium">{c.name}</span>{' '}
                    <span className="text-sm text-muted">· {labelFor(c.type)}</span>
                    {testResult[c.id] && (
                      <span className="ml-2 text-xs text-muted">{testResult[c.id]}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-4">
                    <button onClick={() => test(c.id)} className="text-sm text-cyan">
                      Test
                    </button>
                    <button onClick={() => remove(c.id)} className="text-sm text-red-400">
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
