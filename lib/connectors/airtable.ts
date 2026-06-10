import type { Connector } from './types'

export const airtableCreate: Connector = async (config, _ctx, secret) => {
  const apiKey = secret?.apiKey ?? ''
  if (!apiKey) throw new Error('Airtable: no connection configured')

  let fields: unknown = {}
  if (typeof config.fields === 'string' && config.fields.trim()) {
    try {
      fields = JSON.parse(config.fields)
    } catch {
      throw new Error('Airtable: fields is not valid JSON')
    }
  }
  const url = `https://api.airtable.com/v0/${String(config.baseId ?? '')}/${encodeURIComponent(String(config.table ?? ''))}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`Airtable create failed: ${res.status}`)
  return { created: true }
}
