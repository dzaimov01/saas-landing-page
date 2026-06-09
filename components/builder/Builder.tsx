'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { listStepTypes, getStepType } from '@/lib/steps/registry'
import { nodeTypes, type CadenceNodeData } from './nodes'
import { ConfigPanel } from './ConfigPanel'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Status = 'DRAFT' | 'ENABLED' | 'DISABLED'

export interface BuilderProps {
  workflow: { id: string; name: string; status: Status }
  initialNodes: Node[]
  initialEdges: Edge[]
  canEdit: boolean
}

export function Builder({ workflow, initialNodes, initialEdges, canEdit }: BuilderProps) {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [name, setName] = useState(workflow.name)
  const [status, setStatus] = useState<Status>(workflow.status)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge(c, eds)),
    [setEdges],
  )

  const addNode = useCallback(
    (stepKey: string) => {
      const step = getStepType(stepKey)
      const id = crypto.randomUUID()
      setNodes((nds) =>
        nds.concat({
          id,
          type: 'cadence',
          position: { x: 180 + (nds.length % 3) * 240, y: 80 + nds.length * 70 },
          data: { stepType: stepKey, name: step.label, config: { ...step.defaultConfig } },
        }),
      )
    },
    [setNodes],
  )

  const updateNode = useCallback(
    (id: string, patch: Partial<CadenceNodeData>) => {
      setSaved(false)
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...(n.data as CadenceNodeData), ...patch } } : n)),
      )
    },
    [setNodes],
  )

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const palette = useMemo(() => {
    const all = listStepTypes()
    return {
      TRIGGER: all.filter((s) => s.kind === 'TRIGGER'),
      ACTION: all.filter((s) => s.kind === 'ACTION'),
      CONDITION: all.filter((s) => s.kind === 'CONDITION'),
    }
  }, [])

  async function save() {
    setSaving(true)
    setErrors([])
    setSaved(false)
    const payload = {
      name,
      status,
      nodes: nodes.map((n) => {
        const d = n.data as CadenceNodeData
        return {
          id: n.id,
          type: d.stepType,
          name: d.name,
          config: d.config,
          positionX: n.position.x,
          positionY: n.position.y,
        }
      }),
      edges: edges.map((e) => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        sourceHandle: e.sourceHandle ?? null,
      })),
    }
    const res = await fetch(`/api/workflows/${workflow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (res.status === 422) {
      const j = await res.json().catch(() => ({ errors: ['Validation failed.'] }))
      setErrors(j.errors ?? ['Validation failed.'])
      return
    }
    if (res.ok) {
      setSaved(true)
      // Invalidate the Router Cache so navigating away and back shows saved state.
      router.refresh()
    } else setErrors(['Could not save. Please try again.'])
  }

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/app" className="text-sm text-muted hover:text-fog">
          ← Workflows
        </Link>
        <Input
          aria-label="Workflow name"
          value={name}
          disabled={!canEdit}
          onChange={(e) => {
            setName(e.target.value)
            setSaved(false)
          }}
          className="max-w-xs"
        />
        <select
          aria-label="Status"
          value={status}
          disabled={!canEdit}
          onChange={(e) => {
            setStatus(e.target.value as Status)
            setSaved(false)
          }}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fog"
        >
          <option value="DRAFT">Draft</option>
          <option value="ENABLED">Enabled</option>
          <option value="DISABLED">Disabled</option>
        </select>
        {canEdit && (
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        )}
        {saved && <span className="text-sm text-cyan">Saved</span>}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mb-3 rounded-lg border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
          {errors.map((e, i) => (
            <li key={i}>• {e}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-line">
        {canEdit && (
          <div className="w-48 shrink-0 space-y-4 overflow-y-auto border-r border-line p-3">
            {(['TRIGGER', 'ACTION', 'CONDITION'] as const).map((kind) => (
              <div key={kind}>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {kind.toLowerCase()}
                </p>
                <div className="space-y-1.5">
                  {palette[kind].map((s) => (
                    <button
                      key={s.key}
                      onClick={() => addNode(s.key)}
                      className="w-full rounded-lg border border-line px-3 py-2 text-left text-sm text-fog hover:bg-white/5"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
            nodeTypes={nodeTypes}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            fitView
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {selectedNode && (
          <ConfigPanel
            node={{ id: selectedNode.id, data: selectedNode.data as CadenceNodeData }}
            canEdit={canEdit}
            onChange={updateNode}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  )
}
