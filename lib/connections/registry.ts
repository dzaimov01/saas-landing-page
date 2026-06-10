export interface ConnectionField {
  name: string
  label: string
  placeholder?: string
}

export interface ConnectionType {
  type: string
  label: string
  fields: ConnectionField[]
}

export const CONNECTION_TYPES: Record<string, ConnectionType> = {
  slack: {
    type: 'slack',
    label: 'Slack',
    fields: [{ name: 'webhookUrl', label: 'Incoming webhook URL', placeholder: 'https://hooks.slack.com/services/...' }],
  },
  discord: {
    type: 'discord',
    label: 'Discord',
    fields: [{ name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' }],
  },
  telegram: {
    type: 'telegram',
    label: 'Telegram',
    fields: [{ name: 'botToken', label: 'Bot token', placeholder: '123456:ABC-DEF...' }],
  },
  airtable: {
    type: 'airtable',
    label: 'Airtable',
    fields: [{ name: 'apiKey', label: 'Personal access token', placeholder: 'pat...' }],
  },
  notion: {
    type: 'notion',
    label: 'Notion',
    fields: [{ name: 'token', label: 'Integration token', placeholder: 'secret_...' }],
  },
  openai: {
    type: 'openai',
    label: 'OpenAI',
    fields: [{ name: 'apiKey', label: 'API key', placeholder: 'sk-...' }],
  },
}

export function getConnectionType(type: string): ConnectionType {
  const t = CONNECTION_TYPES[type]
  if (!t) throw new Error(`Unknown connection type: ${type}`)
  return t
}

export function listConnectionTypes(): ConnectionType[] {
  return Object.values(CONNECTION_TYPES)
}
