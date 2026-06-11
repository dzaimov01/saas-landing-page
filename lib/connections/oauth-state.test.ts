import { describe, it, expect, beforeAll } from 'vitest'
import { newStateToken, readStateToken } from './oauth-state'

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret-test-secret-test'
})

describe('oauth state token', () => {
  it('round-trips a signed state payload', () => {
    const { token, state } = newStateToken('google', 'ws1')
    const parsed = readStateToken(token)
    expect(parsed).toEqual({ state, provider: 'google', workspaceId: 'ws1' })
  })

  it('rejects a tampered payload', () => {
    const { token } = newStateToken('google', 'ws1')
    const [body, sig] = token.split('.')
    const forged = Buffer.from(
      JSON.stringify({ state: 'x', provider: 'hubspot', workspaceId: 'evil' }),
    ).toString('base64url')
    expect(readStateToken(`${forged}.${sig}`)).toBeNull()
    expect(readStateToken(undefined)).toBeNull()
    expect(readStateToken(body)).toBeNull()
  })
})
