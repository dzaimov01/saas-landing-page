import { db } from './db'
import { encrypt, decrypt } from './crypto'
import { getConnectionType } from './connections/registry'
import { refreshAccessToken, type OAuthProviderId } from './connections/oauth'

const REFRESH_SKEW_MS = 60_000

export function listConnections(workspaceId: string) {
  return db.connection.findMany({
    where: { workspaceId },
    select: { id: true, type: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createConnection(args: {
  workspaceId: string
  type: string
  name: string
  fields: Record<string, unknown>
}) {
  const def = getConnectionType(args.type)
  const clean: Record<string, string> = {}
  for (const field of def.fields) {
    const value = String(args.fields[field.name] ?? '').trim()
    if (!value) throw new Error(`Missing field: ${field.label}`)
    clean[field.name] = value
  }
  const secret = encrypt(JSON.stringify(clean))
  return db.connection.create({
    data: { workspaceId: args.workspaceId, type: args.type, name: args.name, secret },
    select: { id: true, type: true, name: true },
  })
}

export async function deleteConnection(id: string, workspaceId: string): Promise<void> {
  await db.connection.deleteMany({ where: { id, workspaceId } })
}

export async function getDecryptedSecret(
  connectionId: string,
  workspaceId: string,
): Promise<Record<string, string> | null> {
  const conn = await db.connection.findFirst({ where: { id: connectionId, workspaceId } })
  if (!conn) return null
  return JSON.parse(decrypt(conn.secret)) as Record<string, string>
}

/**
 * Decrypt a connection's secret, refreshing the OAuth access token first when it is
 * expired (within a small skew). Apikey connections pass through unchanged. The
 * execution engine uses this so runs always receive a usable credential.
 */
export async function getUsableSecret(
  connectionId: string,
  workspaceId: string,
): Promise<Record<string, string> | null> {
  const conn = await db.connection.findFirst({ where: { id: connectionId, workspaceId } })
  if (!conn) return null
  const secret = JSON.parse(decrypt(conn.secret)) as Record<string, string>

  const def = getConnectionType(conn.type)
  if (def.auth !== 'oauth' || !def.provider) return secret

  const expiresAt = Number(secret.expiresAt ?? 0)
  if (expiresAt - Date.now() > REFRESH_SKEW_MS) return secret

  const tokens = await refreshAccessToken(def.provider as OAuthProviderId, secret.refreshToken ?? '')
  const updated = { ...secret, ...tokens }
  await db.connection.update({
    where: { id: conn.id },
    data: { secret: encrypt(JSON.stringify(updated)) },
  })
  return updated
}
