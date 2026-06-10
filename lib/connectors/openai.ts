import type { Connector } from './types'

export const openaiComplete: Connector = async (config, _ctx, secret) => {
  const apiKey = secret?.apiKey ?? ''
  if (!apiKey) throw new Error('OpenAI: no connection configured')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: String(config.model || 'gpt-4o-mini'),
      messages: [{ role: 'user', content: String(config.prompt ?? '') }],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI completion failed: ${res.status}`)
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return { text: data.choices?.[0]?.message?.content ?? '' }
}
