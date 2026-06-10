import type { Connector } from './types'
import { logger } from '../logger'

export const slackMessage: Connector = async (config) => {
  const webhookUrl = String(config.webhookUrl ?? '')
  const text = String(config.text ?? '')
  if (!webhookUrl) {
    // Dev fallback: no webhook configured — log instead of failing.
    logger.info('slack (dev fallback)', { text })
    return { delivered: false, dev: true }
  }
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) throw new Error(`Slack webhook failed: ${res.status}`)
  return { delivered: true }
}
