export type OAuthProviderId = 'google' | 'hubspot'

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // epoch millis as string
  scope: string
}

interface OAuthProvider {
  id: OAuthProviderId
  connectionType: string
  authorizeUrl: string
  tokenUrl: string
  scopes: string[]
  clientIdEnv: string
  clientSecretEnv: string
  extraAuthParams?: Record<string, string>
}

export const OAUTH_PROVIDERS: Record<OAuthProviderId, OAuthProvider> = {
  google: {
    id: 'google',
    connectionType: 'google_sheets',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    clientIdEnv: 'GOOGLE_CONNECT_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CONNECT_CLIENT_SECRET',
    extraAuthParams: { access_type: 'offline', prompt: 'consent' },
  },
  hubspot: {
    id: 'hubspot',
    connectionType: 'hubspot',
    authorizeUrl: 'https://app.hubspot.com/oauth/authorize',
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    scopes: ['crm.objects.contacts.write', 'crm.objects.contacts.read'],
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
  },
}

export function getOAuthProvider(id: string): OAuthProvider {
  const p = OAUTH_PROVIDERS[id as OAuthProviderId]
  if (!p) throw new Error(`Unknown OAuth provider: ${id}`)
  return p
}

function clientId(p: OAuthProvider): string {
  return process.env[p.clientIdEnv] ?? ''
}
function clientSecret(p: OAuthProvider): string {
  return process.env[p.clientSecretEnv] ?? ''
}

export function oauthEnabled(id: string): boolean {
  const p = OAUTH_PROVIDERS[id as OAuthProviderId]
  return !!p && !!clientId(p) && !!clientSecret(p)
}

function appUrl(): string {
  return process.env.APP_URL ?? 'http://localhost:3000'
}

export function redirectUri(id: OAuthProviderId): string {
  return `${appUrl()}/api/connections/oauth/${id}/callback`
}

export function buildAuthorizeUrl(id: OAuthProviderId, state: string): string {
  const p = getOAuthProvider(id)
  const url = new URL(p.authorizeUrl)
  url.searchParams.set('client_id', clientId(p))
  url.searchParams.set('redirect_uri', redirectUri(id))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', p.scopes.join(' '))
  url.searchParams.set('state', state)
  for (const [k, v] of Object.entries(p.extraAuthParams ?? {})) url.searchParams.set(k, v)
  return url.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
}

function toTokens(json: TokenResponse, fallbackRefresh: string, fallbackScope: string): OAuthTokens {
  const expiresIn = typeof json.expires_in === 'number' ? json.expires_in : 3600
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? fallbackRefresh,
    expiresAt: String(Date.now() + expiresIn * 1000),
    scope: json.scope ?? fallbackScope,
  }
}

async function postToken(p: OAuthProvider, body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) throw new Error(`${p.id} token request failed: ${res.status}`)
  return (await res.json()) as TokenResponse
}

export async function exchangeCode(id: OAuthProviderId, code: string): Promise<OAuthTokens> {
  const p = getOAuthProvider(id)
  const json = await postToken(
    p,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId(p),
      client_secret: clientSecret(p),
      redirect_uri: redirectUri(id),
    }),
  )
  return toTokens(json, '', p.scopes.join(' '))
}

export async function refreshAccessToken(
  id: OAuthProviderId,
  refreshToken: string,
): Promise<OAuthTokens> {
  const p = getOAuthProvider(id)
  const json = await postToken(
    p,
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId(p),
      client_secret: clientSecret(p),
    }),
  )
  return toTokens(json, refreshToken, p.scopes.join(' '))
}
