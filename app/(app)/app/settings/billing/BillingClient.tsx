'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

type Plan = {
  key: 'STARTER' | 'TEAM' | 'SCALE'
  name: string
  maxWorkflows: number | null
  maxRunsPerMonth: number
}

const TIERS = [
  { key: 'TEAM' as const, name: 'Team', monthly: 24, annual: 19 },
  { key: 'SCALE' as const, name: 'Scale', monthly: 79, annual: 63 },
]

function Meter({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="text-fog">
          {used.toLocaleString()} / {limit === null ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet to-cyan"
          style={{ width: `${limit ? pct : 6}%` }}
        />
      </div>
    </div>
  )
}

export function BillingClient({
  enabled,
  canManage,
  plan,
  usage,
  status,
  hasSubscription,
}: {
  enabled: boolean
  canManage: boolean
  plan: Plan
  usage: { workflows: number; runs: number }
  status: string | null
  hasSubscription: boolean
}) {
  const [interval, setInterval] = useState<'monthly' | 'annual'>('annual')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function checkout(tier: 'TEAM' | 'SCALE') {
    setBusy(tier)
    setError('')
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: tier, interval }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.assign(url)
    } else {
      const j = await res.json().catch(() => ({}))
      setError(j.error ?? 'Could not start checkout.')
      setBusy('')
    }
  }

  async function portal() {
    setBusy('portal')
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    if (res.ok) {
      const { url } = await res.json()
      window.location.assign(url)
    } else {
      setError('Could not open the billing portal.')
      setBusy('')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold">Billing</h1>

      <div className="mb-8 rounded-2xl border border-line p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">Current plan</p>
            <p className="font-display text-xl font-bold">
              {plan.name}
              {status && status !== 'active' && (
                <span className="ml-2 text-sm font-normal text-amber-300">({status})</span>
              )}
            </p>
          </div>
          {canManage && enabled && hasSubscription && (
            <Button variant="ghost" onClick={portal} disabled={busy === 'portal'}>
              Manage billing
            </Button>
          )}
        </div>
        <div className="mt-5 space-y-4">
          <Meter label="Workflows" used={usage.workflows} limit={plan.maxWorkflows} />
          <Meter label="Runs this month" used={usage.runs} limit={plan.maxRunsPerMonth} />
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}

      {!enabled ? (
        <p className="rounded-2xl border border-line p-5 text-sm text-muted">
          Billing isn&apos;t configured yet. Add your Stripe keys and run{' '}
          <code className="text-cyan">npm run stripe:setup</code> to enable upgrades.
        </p>
      ) : (
        canManage && (
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface p-1 text-sm">
              <button
                onClick={() => setInterval('monthly')}
                aria-pressed={interval === 'monthly'}
                className={`rounded-full px-4 py-1.5 font-semibold ${interval === 'monthly' ? 'bg-fog text-ink' : 'text-muted'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setInterval('annual')}
                aria-pressed={interval === 'annual'}
                className={`rounded-full px-4 py-1.5 font-semibold ${interval === 'annual' ? 'bg-fog text-ink' : 'text-muted'}`}
              >
                Annual <span className="text-cyan">−20%</span>
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {TIERS.map((t) => (
                <div key={t.key} className="rounded-2xl border border-line p-5">
                  <p className="font-display text-lg font-bold">{t.name}</p>
                  <p className="mt-1 mb-4 text-2xl font-extrabold">
                    £{interval === 'annual' ? t.annual : t.monthly}
                    <span className="text-sm font-normal text-muted">/mo</span>
                  </p>
                  <Button
                    onClick={() => checkout(t.key)}
                    disabled={busy === t.key || plan.key === t.key}
                    className="w-full"
                  >
                    {plan.key === t.key ? 'Current plan' : busy === t.key ? 'Redirecting…' : `Upgrade to ${t.name}`}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
