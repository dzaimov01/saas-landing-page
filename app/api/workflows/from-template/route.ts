import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireUser, getActiveWorkspace } from '@/lib/session'
import { requireWorkspaceRole, RbacError } from '@/lib/rbac'
import { assertCanCreateWorkflow, PlanLimitError } from '@/lib/billing'
import { getTemplate } from '@/lib/templates'
import { generateToken } from '@/lib/tokens'

const Body = z.object({ key: z.string().min(1) })

/** Rewrite {{steps.<oldId>...}} references to the regenerated node ids. */
function rewriteConfig(config: Record<string, unknown>, idMap: Map<string, string>) {
  let s = JSON.stringify(config)
  for (const [oldId, newId] of idMap) s = s.split(`steps.${oldId}`).join(`steps.${newId}`)
  return JSON.parse(s) as Record<string, unknown>
}

export async function POST(req: Request) {
  const user = await requireUser()
  const active = await getActiveWorkspace(user.id)
  if (!active) return NextResponse.json({ error: 'No workspace' }, { status: 400 })
  try {
    await requireWorkspaceRole(user.id, active.workspace.id, 'MEMBER')
  } catch (e) {
    if (e instanceof RbacError) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    throw e
  }

  const parsed = Body.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  const tpl = getTemplate(parsed.data.key)
  if (!tpl) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

  try {
    await assertCanCreateWorkflow(active.workspace.id)
  } catch (e) {
    if (e instanceof PlanLimitError) return NextResponse.json({ error: e.message, code: e.code }, { status: 402 })
    throw e
  }

  const wf = await db.workflow.create({
    data: {
      workspaceId: active.workspace.id,
      createdById: user.id,
      name: tpl.name,
      status: 'DRAFT',
      webhookToken: generateToken(16),
    },
  })

  const idMap = new Map(tpl.nodes.map((node) => [node.id, crypto.randomUUID()]))
  await db.$transaction([
    db.workflowNode.createMany({
      data: tpl.nodes.map((node) => ({
        id: idMap.get(node.id)!,
        workflowId: wf.id,
        type: node.type,
        name: node.name,
        config: rewriteConfig(node.config, idMap) as Prisma.InputJsonValue,
        positionX: node.positionX,
        positionY: node.positionY,
      })),
    }),
    db.workflowEdge.createMany({
      data: tpl.edges.map((edge) => ({
        id: crypto.randomUUID(),
        workflowId: wf.id,
        sourceId: idMap.get(edge.sourceId)!,
        targetId: idMap.get(edge.targetId)!,
        sourceHandle: edge.sourceHandle,
      })),
    }),
  ])

  return NextResponse.json({ id: wf.id }, { status: 201 })
}
