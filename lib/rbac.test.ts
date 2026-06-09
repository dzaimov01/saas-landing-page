import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hasRequiredRole, RbacError, requireWorkspaceRole } from './rbac'

const { db } = vi.hoisted(() => ({ db: { membership: { findUnique: vi.fn() } } }))
vi.mock('./db', () => ({ db }))
beforeEach(() => db.membership.findUnique.mockReset())

describe('hasRequiredRole', () => {
  it('OWNER satisfies an ADMIN requirement', () => {
    expect(hasRequiredRole('OWNER', 'ADMIN')).toBe(true)
  })
  it('MEMBER does not satisfy ADMIN', () => {
    expect(hasRequiredRole('MEMBER', 'ADMIN')).toBe(false)
  })
})

describe('requireWorkspaceRole', () => {
  it('throws RbacError when the user is not a member', async () => {
    db.membership.findUnique.mockResolvedValue(null)
    await expect(requireWorkspaceRole('u1', 'w1', 'MEMBER')).rejects.toBeInstanceOf(RbacError)
  })
  it('returns the membership when the role is sufficient', async () => {
    db.membership.findUnique.mockResolvedValue({ id: 'm1', role: 'ADMIN' })
    const m = await requireWorkspaceRole('u1', 'w1', 'ADMIN')
    expect(m.role).toBe('ADMIN')
  })
})
