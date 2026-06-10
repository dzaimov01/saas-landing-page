import type { Connector } from './types'
import { logger } from '../logger'

export const slackMessage: Connector = async (config, _ctx, secret) => {
  const webhookUrl = secret?.webhookUrl ?? ''
  const text = String(config.text ?? '')
  if (!webhookUrl) {
    logger.info('slack (no connection configured)', { text })
    return { delivered: false }
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`)
  return { delivered: true }
}
