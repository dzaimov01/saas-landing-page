import type { Connector } from './types'

export const discordMessage: Connector = async (config, _ctx, secret) => {
  const webhookUrl = secret?.webhookUrl ?? ''
  if (!webhookUrl) throw new Error('Discord: no connection configured')
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: String(config.content ?? '') }),
  })
  if (!res.ok) throw new Error(`Discord webhook failed: ${res.status}`)
  return { delivered: true }
}
