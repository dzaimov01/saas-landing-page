import { describe, it, expect, vi, afterEach } from 'vitest'
import { httpRequest } from './http'
import { slackMessage } from './slack'
import { delay } from './delay'
import { getConnector } from './index'

const ctx = { trigger: {}, steps: {} }

afterEach(() => vi.unstubAllGlobals())

describe('http_request connector', () => {
  it('calls fetch and returns status + body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', fetchMock)
    const out = await httpRequest({ method: 'GET', url: 'https://x.com' }, ctx)
    expect(fetchMock).toHaveBeenCalledWith('https://x.com', expect.objectContaining({ method: 'GET' }))
    expect(out).toMatchObject({ status: 200, body: 'ok' })
  })
  it('throws on missing url', async () => {
    await expect(httpRequest({ method: 'GET', url: '' }, ctx)).rejects.toThrow(/url/)
  })
})

describe('slack connector', () => {
  it('dev-falls back when no webhook url', async () => {
    const out = await slackMessage({ webhookUrl: '', text: 'hi' }, ctx)
    expect(out).toMatchObject({ delivered: false, dev: true })
  })
})

describe('delay connector', () => {
  it('returns immediately for 0 seconds', async () => {
    expect(await delay({ seconds: 0 }, ctx)).toEqual({ waitedSeconds: 0 })
  })
})

describe('registry', () => {
  it('resolves known connectors and throws on unknown', () => {
    expect(getConnector('http_request')).toBe(httpRequest)
    expect(() => getConnector('nope')).toThrow()
  })
})
