import { describe, it, expect, vi, afterEach } from 'vitest'
import { testConnection } from './test'

afterEach(() => vi.unstubAllGlobals())

describe('testConnection', () => {
  it('telegram calls getMe and reports ok', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })
    vi.stubGlobal('fetch', fetchMock)
    const r = await testConnection('telegram', { botToken: 'abc' })
    expect(fetchMock.mock.calls[0][0]).toContain('/botabc/getMe')
    expect(r.ok).toBe(true)
  })

  it('openai reports failure on non-ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }))
    const r = await testConnection('openai', { apiKey: 'sk' })
    expect(r.ok).toBe(false)
    expect(r.message).toContain('401')
  })

  it('slack posts a test message to the webhook', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    const r = await testConnection('slack', { webhookUrl: 'https://hooks/x' })
    expect(fetchMock).toHaveBeenCalledWith('https://hooks/x', expect.objectContaining({ method: 'POST' }))
    expect(r.ok).toBe(true)
  })

  it('hubspot uses the bearer access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
    vi.stubGlobal('fetch', fetchMock)
    await testConnection('hubspot', { accessToken: 'at' })
    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer at')
  })

  it('handles network errors gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    const r = await testConnection('notion', { token: 'x' })
    expect(r.ok).toBe(false)
    expect(r.message).toContain('ECONNREFUSED')
  })

  it('reports unknown types', async () => {
    const r = await testConnection('mystery', {})
    expect(r.ok).toBe(false)
  })
})
