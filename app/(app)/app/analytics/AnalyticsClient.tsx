'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { RunsSummary } from '@/lib/analytics'

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </div>
  )
}

const tooltipStyle = {
  background: '#10131a',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 12,
}

export function AnalyticsClient({
  summary,
  quota,
}: {
  summary: RunsSummary
  quota: { used: number; limit: number | null }
}) {
  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Analytics</h1>

      {summary.total === 0 ? (
        <div className="rounded-2xl border border-line p-12 text-center">
          <h2 className="font-display text-xl font-bold">No runs yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Once your workflows start running, you&apos;ll see success rates and trends here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-4">
            <Kpi label="Runs (30d)" value={summary.total.toLocaleString()} />
            <Kpi label="Success rate" value={`${summary.successRate}%`} />
            <Kpi label="Failed" value={summary.failed.toLocaleString()} />
            <Kpi
              label="Runs this month"
              value={`${quota.used.toLocaleString()}${
                quota.limit === null ? '' : ` / ${quota.limit.toLocaleString()}`
              }`}
            />
          </div>

          <div className="mb-8 rounded-2xl border border-line p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
              Runs over time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.perDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8b93a7' }}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#8b93a7' }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="succeeded" stackId="a" fill="#34d399" />
                <Bar dataKey="failed" stackId="a" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-line p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-muted">
              Top workflows
            </h2>
            <ResponsiveContainer
              width="100%"
              height={Math.max(120, summary.topWorkflows.length * 48)}
            >
              <BarChart data={summary.topWorkflows} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#8b93a7' }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={140}
                  tick={{ fontSize: 11, fill: '#8b93a7' }}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  )
}
