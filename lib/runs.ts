import { db } from './db'

export function listRuns(workspaceId: string) {
  return db.workflowRun.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { workflow: { select: { name: true } } },
  })
}

export function getRun(id: string, workspaceId: string) {
  return db.workflowRun.findFirst({
    where: { id, workspaceId },
    include: {
      workflow: { select: { name: true } },
      steps: { orderBy: { startedAt: 'asc' } },
    },
  })
}
