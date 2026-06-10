import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueueRun } from '@/lib/queue'

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const workflow = await db.workflow.findUnique({
    where: { webhookToken: token },
    include: { nodes: true },
  })
  if (!workflow || workflow.status !== 'ENABLED') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (!workflow.nodes.some((n) => n.type === 'webhook')) {
    return NextResponse.json({ error: 'Workflow has no webhook trigger' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({}))
  const run = await db.workflowRun.create({
    data: {
      workflowId: workflow.id,
      workspaceId: workflow.workspaceId,
      status: 'QUEUED',
      trigger: body as object,
    },
  })
  try {
    await enqueueRun(run.id)
  } catch {
    return NextResponse.json({ error: 'Execution engine unavailable' }, { status: 503 })
  }
  return NextResponse.json({ runId: run.id }, { status: 202 })
}
