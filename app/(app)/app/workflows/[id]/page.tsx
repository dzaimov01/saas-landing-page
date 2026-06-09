import { notFound, redirect } from 'next/navigation'
import type { Node, Edge } from '@xyflow/react'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { getWorkflow } from '@/lib/workflows'
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

  return (
    <Builder
      workflow={{ id: wf.id, name: wf.name, status: wf.status }}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      canEdit={true}
    />
  )
}
