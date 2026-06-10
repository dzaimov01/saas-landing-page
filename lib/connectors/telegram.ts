import type { Connector } from './types'

export const telegramMessage: Connector = async (config, _ctx, secret) => {
  const token = secret?.botToken ?? ''
  if (!token) throw new Error('Telegram: no connection configured')
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(config.chatId ?? ''), text: String(config.text ?? '') }),
  })
  if (!res.ok) throw new Error(`Telegram sendMessage failed: ${res.status}`)
  return { delivered: true }
}
