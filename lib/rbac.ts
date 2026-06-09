import { db } from './db'
import type { Role } from '@prisma/client'

const RANK: Record<Role, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 }

export class RbacError extends Error {
  constructor(message = 'Forbidden') {
    super(message)
    this.name = 'RbacError'
  }
}

export function hasRequiredRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required]
}

export async function requireWorkspaceRole(userId: string, workspaceId: string, required: Role) {
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
  })
  if (!membership || !hasRequiredRole(membership.role, required)) {
    throw new RbacError()
  }
  return membership
}
