import type { Connector } from './types'

export const notionCreate: Connector = async (config, _ctx, secret) => {
  const token = secret?.token ?? ''
  if (!token) throw new Error('Notion: no connection configured')
  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: String(config.databaseId ?? '') },
      properties: { Name: { title: [{ text: { content: String(config.title ?? '') } }] } },
    }),
  })
  if (!res.ok) throw new Error(`Notion create page failed: ${res.status}`)
  return { created: true }
}
