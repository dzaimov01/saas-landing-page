import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

const ENV = process.env

beforeEach(() => {
  process.env = { ...ENV, APP_URL: 'https://app.test', AUTH_SECRET: 'x'.repeat(20) }
  vi.resetModules()
})
afterEach(() => {
  process.env = ENV
  vi.unstubAllGlobals()
})

describe('oauth provider helpers', () => {
  it('oauthEnabled reflects client env presence', async () => {
    const { oauthEnabled } = await import('./oauth')
    expect(oauthEnabled('google')).toBe(false)
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'id'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'secret'
    expect(oauthEnabled('google')).toBe(true)
  })

  it('buildAuthorizeUrl includes the required params', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    const { buildAuthorizeUrl } = await import('./oauth')
    const url = new URL(buildAuthorizeUrl('google', 'state123'))
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://app.test/api/connections/oauth/google/callback',
    )
    expect(url.searchParams.get('state')).toBe('state123')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('scope')).toContain('spreadsheets')
  })

  it('exchangeCode parses the token response', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3600,
          scope: 'https://www.googleapis.com/auth/spreadsheets',
        }),
      }),
    )
    const { exchangeCode } = await import('./oauth')
    const before = Date.now()
    const tok = await exchangeCode('google', 'thecode')
    expect(tok.accessToken).toBe('at')
    expect(tok.refreshToken).toBe('rt')
    expect(Number(tok.expiresAt)).toBeGreaterThanOrEqual(before + 3600_000 - 5000)
  })

  it('refreshAccessToken keeps the old refresh token when none returned', async () => {
    process.env.HUBSPOT_CLIENT_ID = 'cid'
    process.env.HUBSPOT_CLIENT_SECRET = 'sec'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'newAt', expires_in: 1800 }),
      }),
    )
    const { refreshAccessToken } = await import('./oauth')
    const tok = await refreshAccessToken('hubspot', 'origRt')
    expect(tok.accessToken).toBe('newAt')
    expect(tok.refreshToken).toBe('origRt')
  })
})
