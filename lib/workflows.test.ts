import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    workflow: { updateMany: vi.fn() },
    workflowNode: { deleteMany: vi.fn(), createMany: vi.fn() },
    workflowEdge: { deleteMany: vi.fn(), createMany: vi.fn() },
  },
}))
vi.mock('./db', () => ({ db }))

import { saveWorkflow, WorkflowValidationError } from './workflows'

beforeEach(() => {
  db.$transaction.mockReset().mockResolvedValue([])
})

const trig = {
  id: 't',
  type: 'schedule',
  name: 'Schedule',
  config: { mode: 'interval', value: '15' },
  positionX: 0,
  positionY: 0,
}

describe('saveWorkflow', () => {
  it('refuses to ENABLE an invalid graph (no trigger)', async () => {
    await expect(
      saveWorkflow({ id: 'w', workspaceId: 'ws', name: 'x', status: 'ENABLED', nodes: [], edges: [] }),
    ).rejects.toBeInstanceOf(WorkflowValidationError)
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('saves a DRAFT without validation', async () => {
    await saveWorkflow({
      id: 'w',
      workspaceId: 'ws',
      name: 'x',
      status: 'DRAFT',
      nodes: [trig],
      edges: [],
    })
    expect(db.$transaction).toHaveBeenCalledOnce()
  })

  it('saves a valid ENABLED graph', async () => {
    await saveWorkflow({
      id: 'w',
      workspaceId: 'ws',
      name: 'x',
      status: 'ENABLED',
      nodes: [trig],
      edges: [],
    })
    expect(db.$transaction).toHaveBeenCalledOnce()
  })
})
