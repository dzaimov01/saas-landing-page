'use client'

import { getStepType } from '@/lib/steps/registry'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { CadenceNodeData } from './nodes'

export function ConfigPanel({
  node,
  canEdit,
  webhookUrl,
  connections = [],
  onChange,
  onClose,
}: {
  node: { id: string; data: CadenceNodeData }
  canEdit: boolean
  webhookUrl?: string | null
  connections?: { id: string; type: string; name: string }[]
  onChange: (id: string, patch: Partial<CadenceNodeData>) => void
  onClose: () => void
}) {
  const step = getStepType(node.data.stepType)
  const config = node.data.config ?? {}

  function setConfig(name: string, value: unknown) {
    onChange(node.id, { config: { ...config, [name]: value } })
  }

  return (
    <aside className="w-80 shrink-0 border-l border-line bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">
          {step.label}
        </h2>
        <button onClick={onClose} className="text-sm text-muted hover:text-fog">
          Done
        </button>
      </div>

      <div className="space-y-4">
        {node.data.stepType === 'webhook' && webhookUrl && (
          <div className="rounded-lg border border-line bg-surface p-3">
            <p className="mb-1 text-xs font-semibold text-muted">Webhook URL (POST to trigger)</p>
            <code className="block break-all text-xs text-cyan">{webhookUrl}</code>
          </div>
        )}
        <div>
          <Label htmlFor="node-name">Step name</Label>
          <Input
            id="node-name"
            value={node.data.name}
            disabled={!canEdit}
            onChange={(e) => onChange(node.id, { name: e.target.value })}
          />
        </div>

        {step.fields.map((f) => {
          const value = (config as Record<string, unknown>)[f.name]
          const strValue = value === undefined || value === null ? '' : String(value)
          return (
            <div key={f.name}>
              <Label htmlFor={`f-${f.name}`}>{f.label}</Label>
              {f.type === 'connection' ? (
                (() => {
                  const matches = connections.filter((c) => c.type === step.connectionType)
                  if (matches.length === 0) {
                    return (
                      <p className="text-sm text-muted">
                        No {step.connectionType} connection.{' '}
                        <a href="/app/connections" className="text-cyan">
                          Add one
                        </a>
                      </p>
                    )
                  }
                  return (
                    <select
                      id={`f-${f.name}`}
                      value={strValue}
                      disabled={!canEdit}
                      onChange={(e) => setConfig(f.name, e.target.value)}
                      className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
                    >
                      <option value="">Select a connection…</option>
                      {matches.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )
                })()
              ) : f.type === 'select' ? (
                <select
                  id={`f-${f.name}`}
                  value={strValue}
                  disabled={!canEdit}
                  onChange={(e) => setConfig(f.name, e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog"
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  id={`f-${f.name}`}
                  value={strValue}
                  placeholder={f.placeholder}
                  disabled={!canEdit}
                  onChange={(e) => setConfig(f.name, e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-fog outline-none focus-visible:border-violet"
                />
              ) : (
                <Input
                  id={`f-${f.name}`}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={strValue}
                  placeholder={f.placeholder}
                  disabled={!canEdit}
                  onChange={(e) => setConfig(f.name, e.target.value)}
                />
              )}
            </div>
          )
        })}
        {step.fields.length === 0 && (
          <p className="text-sm text-muted">This step has no configuration.</p>
        )}
      </div>
    </aside>
  )
}
