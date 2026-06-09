import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPersonalWorkspace } from './workspace'

const { db } = vi.hoisted(() => ({
  db: {
    workspace: { findUnique: vi.fn(), create: vi.fn() },
    membership: { create: vi.fn() },
  },
}))
vi.mock('./db', () => ({ db }))

beforeEach(() => {
  db.workspace.findUnique.mockReset()
  db.workspace.create.mockReset()
  db.membership.create.mockReset()
})

describe('createPersonalWorkspace', () => {
  it('creates a workspace with a free slug and an OWNER membership', async () => {
    db.workspace.findUnique.mockResolvedValue(null)
    db.workspace.create.mockResolvedValue({ id: 'w1', name: "Ada's workspace", slug: 'ada-s-workspace' })
    db.membership.create.mockResolvedValue({ id: 'm1' })

    const ws = await createPersonalWorkspace({ userId: 'u1', name: 'Ada' })

    expect(ws.id).toBe('w1')
    expect(db.workspace.create).toHaveBeenCalledOnce()
    expect(db.membership.create).toHaveBeenCalledWith({
      data: { userId: 'u1', workspaceId: 'w1', role: 'OWNER' },
    })
  })
})
