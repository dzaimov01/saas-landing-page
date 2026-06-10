import { describe, it, expect, vi, afterEach } from 'vitest'
import { httpRequest } from './http'
import { slackMessage } from './slack'
import { discordMessage } from './discord'
import { openaiComplete } from './openai'
import { setData } from './setdata'
import { filter } from './filter'
import { delay } from './delay'
import { getConnector } from './index'

const ctx = { trigger: { amount: 10 }, steps: {} }

afterEach(() => vi.unstubAllGlobals())

describe('http_request connector', () => {
  it('calls fetch and returns status + body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, text: async () => 'ok' })
    vi.stubGlobal('fetch', fetchMock)
    const out = await httpRequest({ method: 'GET', url: 'https://x.com' }, ctx)
    expect(out).toMatchObject({ status: 200, body: 'ok' })
  })
})

describe('credentialed connectors use the secret', () => {
  it('slack posts to the connection webhook url', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await slackMessage({ text: 'hi' }, ctx, { webhookUrl: 'https://hooks/x' })
    expect(fetchMock).toHaveBeenCalledWith('https://hooks/x', expect.objectContaining({ method: 'POST' }))
  })
  it('discord throws without a connection', async () => {
    await expect(discordMessage({ content: 'x' }, ctx, undefined)).rejects.toThrow(/connection/)
  })
  it('openai returns the completion text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello world' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const out = await openaiComplete({ prompt: 'hi', model: 'gpt-4o-mini' }, ctx, { apiKey: 'sk-x' })
    expect(out).toEqual({ text: 'hello world' })
  })
})

describe('utility connectors', () => {
  it('set_data parses json', async () => {
    expect(await setData({ json: '{"name":"Ada"}' }, ctx)).toEqual({ name: 'Ada' })
  })
  it('filter evaluates the condition', async () => {
    expect(await filter({ field: 'trigger.amount', operator: 'gt', value: '5' }, ctx)).toEqual({ passed: true })
    expect(await filter({ field: 'trigger.amount', operator: 'lt', value: '5' }, ctx)).toEqual({ passed: false })
  })
  it('delay returns immediately for 0 seconds', async () => {
    expect(await delay({ seconds: 0 }, ctx)).toEqual({ waitedSeconds: 0 })
  })
})

describe('registry', () => {
  it('resolves known connectors and throws on unknown', () => {
    expect(getConnector('discord_message')).toBe(discordMessage)
    expect(() => getConnector('nope')).toThrow()
  })
})
