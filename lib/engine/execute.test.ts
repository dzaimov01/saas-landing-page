import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { db } from '../db'
import { executeRun } from './execute'

// Integration test — requires the test Postgres (DATABASE_URL :5433) with migrations applied.

let workspaceId: string
let userId: string
const createdWorkflowIds: string[] = []

beforeAll(async () => {
  const user = await db.user.create({
    data: { email: `engine-${Date.now()}@example.com`, name: 'Engine' },
  })
  userId = user.id
  const ws = await db.workspace.create({ data: { name: 'Engine WS', slug: `engine-${Date.now()}` } })
  workspaceId = ws.id
  await db.membership.create({ data: { userId, workspaceId, role: 'OWNER' } })
})

afterAll(async () => {
  await db.workflow.deleteMany({ where: { id: { in: createdWorkflowIds } } })
  await db.membership.deleteMany({ where: { workspaceId } })
  await db.workspace.delete({ where: { id: workspaceId } })
  await db.user.delete({ where: { id: userId } })
})

afterEach(() => vi.unstubAllGlobals())

async function seedRun(triggerPayload: unknown) {
  const wf = await db.workflow.create({
    data: { workspaceId, createdById: userId, name: 'Engine WF', status: 'ENABLED' },
  })
  createdWorkflowIds.push(wf.id)
  await db.workflowNode.createMany({
    data: [
      { id: `${wf.id}-t`, workflowId: wf.id, type: 'webhook', name: 'Hook', config: {}, positionX: 0, positionY: 0 },
      {
        id: `${wf.id}-a`,
        workflowId: wf.id,
        type: 'http_request',
        name: 'Call',
        config: { method: 'GET', url: 'https://api.test/{{trigger.id}}' },
        positionX: 0,
        positionY: 100,
      },
    ],
  })
  await db.workflowEdge.create({
    data: { id: `${wf.id}-e`, workflowId: wf.id, sourceId: `${wf.id}-t`, targetId: `${wf.id}-a`, sourceHandle: 'out' },
  })
  return db.workflowRun.create({
    data: { workflowId: wf.id, workspaceId, status: 'QUEUED', trigger: triggerPayload as object },
  })
}

describe('executeRun (integration)', () => {
  it('runs a webhook → http_request workflow with templating', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => 'pong' })
    vi.stubGlobal('fetch', fetchMock)

    const run = await seedRun({ id: 42 })
    await executeRun(run.id)

    const updated = await db.workflowRun.findUnique({ where: { id: run.id }, include: { steps: true } })
    expect(updated?.status).toBe('SUCCEEDED')
    expect(updated?.steps).toHaveLength(2)
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/42', expect.objectContaining({ method: 'GET' }))
  })

  it('marks the run FAILED when a connector throws', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const run = await seedRun({ id: 7 })
    await executeRun(run.id)

    const updated = await db.workflowRun.findUnique({ where: { id: run.id }, include: { steps: true } })
    expect(updated?.status).toBe('FAILED')
    expect(updated?.error).toMatch(/network down/)
    expect(updated?.steps.some((s) => s.status === 'FAILED')).toBe(true)
  })
})
