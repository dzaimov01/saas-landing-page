import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export interface OAuthState {
  state: string
  provider: string
  workspaceId: string
}

function secret(): string {
  return process.env.AUTH_SECRET ?? 'dev-secret'
}

export function newStateToken(
  provider: string,
  workspaceId: string,
): { token: string; state: string } {
  const state = randomBytes(16).toString('hex')
  const payload = JSON.stringify({ state, provider, workspaceId } satisfies OAuthState)
  const body = Buffer.from(payload).toString('base64url')
  const sig = createHmac('sha256', secret()).update(body).digest('base64url')
  return { token: `${body}.${sig}`, state }
}

export function readStateToken(token: string | undefined): OAuthState | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthState
  } catch {
    return null
  }
}
