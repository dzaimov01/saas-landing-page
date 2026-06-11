import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { randomBytes } from 'node:crypto'

beforeAll(() => {
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('base64')
})

const { db } = vi.hoisted(() => ({
  db: { connection: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() } },
}))
vi.mock('./db', () => ({ db }))

beforeEach(() => {
  db.connection.create.mockReset()
  db.connection.findFirst.mockReset()
  db.connection.update.mockReset()
})

describe('connections service', () => {
  it('stores an encrypted secret, not the plaintext', async () => {
    const { createConnection } = await import('./connections')
    db.connection.create.mockImplementation(({ data }: { data: { secret: string } }) => ({
      id: 'c1',
      secret: data.secret,
    }))
    await createConnection({
      workspaceId: 'w',
      type: 'slack',
      name: 'My Slack',
      fields: { webhookUrl: 'https://hooks.slack.com/secret' },
    })
    const stored = db.connection.create.mock.calls[0][0].data.secret
    expect(stored).not.toContain('https://hooks.slack.com/secret')
    expect(stored.split('.')).toHaveLength(3)
  })

  it('rejects missing required fields', async () => {
    const { createConnection } = await import('./connections')
    await expect(
      createConnection({ workspaceId: 'w', type: 'slack', name: 'x', fields: {} }),
    ).rejects.toThrow(/Missing field/)
  })

  it('getDecryptedSecret returns the original fields', async () => {
    const { encrypt } = await import('./crypto')
    const { getDecryptedSecret } = await import('./connections')
    db.connection.findFirst.mockResolvedValue({
      secret: encrypt(JSON.stringify({ webhookUrl: 'https://hooks.slack.com/secret' })),
    })
    expect(await getDecryptedSecret('c1', 'w')).toEqual({
      webhookUrl: 'https://hooks.slack.com/secret',
    })
  })
})

describe('getUsableSecret', () => {
  it('returns apikey secrets unchanged', async () => {
    const { encrypt } = await import('./crypto')
    const { getUsableSecret } = await import('./connections')
    db.connection.findFirst.mockResolvedValue({
      id: 'c1',
      type: 'slack',
      secret: encrypt(JSON.stringify({ webhookUrl: 'https://hooks/x' })),
    })
    expect(await getUsableSecret('c1', 'w')).toEqual({ webhookUrl: 'https://hooks/x' })
    expect(db.connection.update).not.toHaveBeenCalled()
  })

  it('refreshes an expired oauth token and persists it', async () => {
    process.env.GOOGLE_CONNECT_CLIENT_ID = 'cid'
    process.env.GOOGLE_CONNECT_CLIENT_SECRET = 'sec'
    const { encrypt } = await import('./crypto')
    const { getUsableSecret } = await import('./connections')
    db.connection.findFirst.mockResolvedValue({
      id: 'c1',
      type: 'google_sheets',
      secret: encrypt(
        JSON.stringify({ accessToken: 'old', refreshToken: 'rt', expiresAt: '1000', scope: 's' }),
      ),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'fresh', expires_in: 3600 }),
      }),
    )
    const out = await getUsableSecret('c1', 'w')
    expect(out?.accessToken).toBe('fresh')
    expect(db.connection.update).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
