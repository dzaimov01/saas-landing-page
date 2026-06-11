export interface ConnectionField {
  name: string
  label: string
  placeholder?: string
}

export interface ConnectionType {
  type: string
  label: string
  auth: 'apikey' | 'oauth'
  provider?: string
  fields: ConnectionField[]
}

export const CONNECTION_TYPES: Record<string, ConnectionType> = {
  slack: {
    type: 'slack',
    label: 'Slack',
    auth: 'apikey',
    fields: [{ name: 'webhookUrl', label: 'Incoming webhook URL', placeholder: 'https://hooks.slack.com/services/...' }],
  },
  discord: {
    type: 'discord',
    label: 'Discord',
    auth: 'apikey',
    fields: [{ name: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://discord.com/api/webhooks/...' }],
  },
  telegram: {
    type: 'telegram',
    label: 'Telegram',
    auth: 'apikey',
    fields: [{ name: 'botToken', label: 'Bot token', placeholder: '123456:ABC-DEF...' }],
  },
  airtable: {
    type: 'airtable',
    label: 'Airtable',
    auth: 'apikey',
    fields: [{ name: 'apiKey', label: 'Personal access token', placeholder: 'pat...' }],
  },
  notion: {
    type: 'notion',
    label: 'Notion',
    auth: 'apikey',
    fields: [{ name: 'token', label: 'Integration token', placeholder: 'secret_...' }],
  },
  openai: {
    type: 'openai',
    label: 'OpenAI',
    auth: 'apikey',
    fields: [{ name: 'apiKey', label: 'API key', placeholder: 'sk-...' }],
  },
  google_sheets: {
    type: 'google_sheets',
    label: 'Google Sheets',
    auth: 'oauth',
    provider: 'google',
    fields: [],
  },
  hubspot: {
    type: 'hubspot',
    label: 'HubSpot',
    auth: 'oauth',
    provider: 'hubspot',
    fields: [],
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
