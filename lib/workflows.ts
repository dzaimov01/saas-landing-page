import type { Prisma, WorkflowStatus } from '@prisma/client'
import { db } from './db'
import { validateWorkflow } from './steps/validate'

export class WorkflowValidationError extends Error {
  errors: string[]
  constructor(errors: string[]) {
    super('Workflow validation failed')
    this.name = 'WorkflowValidationError'
    this.errors = errors
  }
}

export interface NodeInput {
  id: string
  type: string
  name: string
  config: unknown
  positionX: number
  positionY: number
}
export interface EdgeInput {
  id: string
  sourceId: string
  targetId: string
  sourceHandle: string | null
}

export function listWorkflows(workspaceId: string) {
  return db.workflow.findMany({
    where: { workspaceId },
    orderBy: { updatedAt: 'desc' },
  })
}

export function getWorkflow(id: string, workspaceId: string) {
  return db.workflow.findFirst({
    where: { id, workspaceId },
    include: { nodes: true, edges: true },
  })
}

export function createWorkflow({
  workspaceId,
  userId,
  name,
}: {
  workspaceId: string
  userId: string
  name: string
}) {
  return db.workflow.create({
    data: { workspaceId, createdById: userId, name, status: 'DRAFT' },
  })
}

export async function deleteWorkflow(id: string, workspaceId: string) {
  await db.workflow.deleteMany({ where: { id, workspaceId } })
}

export async function saveWorkflow({
  id,
  workspaceId,
  name,
  status,
  nodes,
  edges,
}: {
  id: string
  workspaceId: string
  name: string
  status: WorkflowStatus
  nodes: NodeInput[]
  edges: EdgeInput[]
}) {
  if (status === 'ENABLED') {
    const { errors } = validateWorkflow(
      nodes.map((n) => ({ id: n.id, type: n.type, config: n.config })),
      edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId, sourceHandle: e.sourceHandle })),
    )
    if (errors.length) throw new WorkflowValidationError(errors)
  }

  await db.$transaction([
    db.workflowEdge.deleteMany({ where: { workflowId: id } }),
    db.workflowNode.deleteMany({ where: { workflowId: id } }),
    db.workflowNode.createMany({
      data: nodes.map((n) => ({
        id: n.id,
        workflowId: id,
        type: n.type,
        name: n.name,
        config: (n.config ?? {}) as Prisma.InputJsonValue,
        positionX: n.positionX,
        positionY: n.positionY,
      })),
    }),
    db.workflowEdge.createMany({
      data: edges.map((e) => ({
        id: e.id,
        workflowId: id,
        sourceId: e.sourceId,
        targetId: e.targetId,
        sourceHandle: e.sourceHandle,
      })),
    }),
    db.workflow.updateMany({ where: { id, workspaceId }, data: { name, status } }),
  ])
}
