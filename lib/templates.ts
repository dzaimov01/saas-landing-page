export interface TemplateNode {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  positionX: number
  positionY: number
}
export interface TemplateEdge {
  id: string
  sourceId: string
  targetId: string
  sourceHandle: string | null
}
export interface WorkflowTemplate {
  key: string
  name: string
  description: string
  category: string
  nodes: TemplateNode[]
  edges: TemplateEdge[]
}

function n(
  id: string,
  type: string,
  name: string,
  config: Record<string, unknown>,
  y: number,
): TemplateNode {
  return { id, type, name, config, positionX: 250, positionY: 40 + y * 130 }
}
function e(id: string, sourceId: string, targetId: string): TemplateEdge {
  return { id, sourceId, targetId, sourceHandle: 'out' }
}

export const TEMPLATES: WorkflowTemplate[] = [
  {
    key: 'webhook-to-email',
    name: 'Webhook → Email alert',
    description: 'Send an email whenever an incoming webhook fires.',
    category: 'Notifications',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('a', 'send_email', 'Send email', { to: '', subject: 'New event', body: 'A new event arrived: {{trigger.body}}' }, 1),
    ],
    edges: [e('e1', 't', 'a')],
  },
  {
    key: 'schedule-http-slack',
    name: 'Scheduled HTTP → Slack digest',
    description: 'On a schedule, call an endpoint and post the result to Slack.',
    category: 'Monitoring',
    nodes: [
      n('t', 'schedule', 'Every hour', { mode: 'interval', value: '60' }, 0),
      n('h', 'http_request', 'Fetch', { method: 'GET', url: '' }, 1),
      n('s', 'slack_message', 'Post to Slack', { connectionId: '', text: 'Fetch returned {{steps.h.status}}' }, 2),
    ],
    edges: [e('e1', 't', 'h'), e('e2', 'h', 's')],
  },
  {
    key: 'webhook-to-discord',
    name: 'Webhook → Discord',
    description: 'Announce incoming events in a Discord channel.',
    category: 'Notifications',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('d', 'discord_message', 'Discord message', { connectionId: '', content: 'New event: {{trigger.body.email}}' }, 1),
    ],
    edges: [e('e1', 't', 'd')],
  },
  {
    key: 'webhook-priority-slack',
    name: 'Priority filter → Slack',
    description: 'Only notify Slack for high-priority webhook payloads.',
    category: 'Routing',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('f', 'filter', 'Only high priority', { field: 'trigger.body.priority', operator: 'eq', value: 'high' }, 1),
      n('s', 'slack_message', 'Alert Slack', { connectionId: '', text: 'High priority: {{trigger.body.title}}' }, 2),
    ],
    edges: [e('e1', 't', 'f'), e('e2', 'f', 's')],
  },
  {
    key: 'ai-summarize-notion',
    name: 'AI summary → Notion',
    description: 'Summarize incoming text with AI and save it to Notion.',
    category: 'AI',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('ai', 'openai_complete', 'Summarize', { connectionId: '', model: 'gpt-4o-mini', prompt: 'Summarize: {{trigger.body.text}}' }, 1),
      n('p', 'notion_create', 'Create Notion page', { connectionId: '', databaseId: '', title: '{{steps.ai.text}}' }, 2),
    ],
    edges: [e('e1', 't', 'ai'), e('e2', 'ai', 'p')],
  },
  {
    key: 'webhook-to-airtable',
    name: 'Webhook → Airtable record',
    description: 'Create an Airtable record from a webhook payload.',
    category: 'Data',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('a', 'airtable_create', 'Create record', { connectionId: '', baseId: '', table: '', fields: '{"Name":"{{trigger.body.name}}"}' }, 1),
    ],
    edges: [e('e1', 't', 'a')],
  },
  {
    key: 'scheduled-telegram-digest',
    name: 'Daily Telegram digest',
    description: 'Fetch data daily and send a Telegram message.',
    category: 'Monitoring',
    nodes: [
      n('t', 'schedule', 'Every day', { mode: 'interval', value: '1440' }, 0),
      n('h', 'http_request', 'Fetch', { method: 'GET', url: '' }, 1),
      n('tg', 'telegram_message', 'Send Telegram', { connectionId: '', chatId: '', text: 'Daily digest: {{steps.h.body}}' }, 2),
    ],
    edges: [e('e1', 't', 'h'), e('e2', 'h', 'tg')],
  },
  {
    key: 'set-data-email',
    name: 'Set data → personalised email',
    description: 'Define values and use them to compose an email.',
    category: 'Utility',
    nodes: [
      n('t', 'webhook', 'Incoming webhook', {}, 0),
      n('sd', 'set_data', 'Set greeting', { json: '{\n  "greeting": "Hello"\n}' }, 1),
      n('m', 'send_email', 'Send email', { to: '', subject: 'Hi', body: '{{steps.sd.greeting}} {{trigger.body.name}}' }, 2),
    ],
    edges: [e('e1', 't', 'sd'), e('e2', 'sd', 'm')],
  },
]

export function getTemplate(key: string): WorkflowTemplate | undefined {
  return TEMPLATES.find((t) => t.key === key)
}
