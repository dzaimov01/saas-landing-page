import type { Connector } from './types'

export const httpRequest: Connector = async (config) => {
  const method = String(config.method ?? 'GET')
  const url = String(config.url ?? '')
  if (!url) throw new Error('HTTP request: missing url')

  let headers: Record<string, string> = {}
  if (typeof config.headers === 'string' && config.headers.trim()) {
    try {
      headers = JSON.parse(config.headers)
    } catch {
      throw new Error('HTTP request: headers is not valid JSON')
    }
  }

  const hasBody = method !== 'GET' && method !== 'DELETE' && config.body
  const res = await fetch(url, {
    method,
    headers,
    body: hasBody ? String(config.body) : undefined,
  })
  const text = await res.text()
  return { status: res.status, body: text.slice(0, 10_000) }
}
