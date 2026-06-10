import { notFound, redirect } from 'next/navigation'
import type { Node, Edge } from '@xyflow/react'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { getWorkflow } from '@/lib/workflows'
import { listConnections } from '@/lib/connections'
import { env } from '@/lib/env'
import { Builder } from '@/components/builder/Builder'

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) redirect('/login')
  const wf = await getWorkflow(id, active.workspace.id)
  if (!wf) notFound()

  const initialNodes: Node[] = wf.nodes.map((n) => ({
    id: n.id,
    type: 'cadence',
    position: { x: n.positionX, y: n.positionY },
    data: {
      stepType: n.type,
      name: n.name,
      config: (n.config ?? {}) as Record<string, unknown>,
    },
  }))
  const initialEdges: Edge[] = wf.edges.map((e) => ({
    id: e.id,
    source: e.sourceId,
    target: e.targetId,
    sourceHandle: e.sourceHandle,
  }))

  const webhookUrl = wf.webhookToken ? `${env.APP_URL}/api/hooks/${wf.webhookToken}` : null
  const connections = await listConnections(active.workspace.id)

  return (
    <Builder
      workflow={{ id: wf.id, name: wf.name, status: wf.status }}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      webhookUrl={webhookUrl}
      connections={connections.map((c) => ({ id: c.id, type: c.type, name: c.name }))}
      canEdit={true}
    />
  )
}
