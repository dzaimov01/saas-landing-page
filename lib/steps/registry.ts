import { z } from 'zod'
import type { StepType } from './types'

export const STEP_TYPES: Record<string, StepType> = {
  schedule: {
    key: 'schedule',
    label: 'Schedule',
    kind: 'TRIGGER',
    description: 'Run on an interval or cron expression.',
    configSchema: z.object({
      mode: z.enum(['interval', 'cron']),
      value: z.string().min(1),
    }),
    defaultConfig: { mode: 'interval', value: '15' },
    fields: [
      {
        name: 'mode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'interval', label: 'Every N minutes' },
          { value: 'cron', label: 'Cron expression' },
        ],
      },
      { name: 'value', label: 'Value', type: 'text', placeholder: '15  or  0 9 * * 1' },
    ],
    handles: { source: ['out'], target: false },
  },

  webhook: {
    key: 'webhook',
    label: 'Webhook',
    kind: 'TRIGGER',
    description: 'Run when an incoming HTTP request is received.',
    configSchema: z.object({}),
    defaultConfig: {},
    fields: [],
    handles: { source: ['out'], target: false },
  },

  http_request: {
    key: 'http_request',
    label: 'HTTP request',
    kind: 'ACTION',
    description: 'Call an external HTTP endpoint.',
    configSchema: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
      url: z.string().url(),
      headers: z.string().optional(),
      body: z.string().optional(),
    }),
    defaultConfig: { method: 'GET', url: '', headers: '', body: '' },
    fields: [
      {
        name: 'method',
        label: 'Method',
        type: 'select',
        options: ['GET', 'POST', 'PUT', 'DELETE'].map((m) => ({ value: m, label: m })),
      },
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/hook' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"X-Key":"..."}' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: '{"hello":"world"}' },
    ],
    handles: { source: ['out'], target: true },
  },

  send_email: {
    key: 'send_email',
    label: 'Send email',
    kind: 'ACTION',
    description: 'Send a transactional email.',
    configSchema: z.object({
      to: z.string().email(),
      subject: z.string().min(1),
      body: z.string().min(1),
    }),
    defaultConfig: { to: '', subject: '', body: '' },
    fields: [
      { name: 'to', label: 'To', type: 'text', placeholder: 'person@example.com' },
      { name: 'subject', label: 'Subject', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea' },
    ],
    handles: { source: ['out'], target: true },
  },

  slack_message: {
    key: 'slack_message',
    label: 'Slack message',
    kind: 'ACTION',
    description: 'Post a message to Slack via a stored connection.',
    connectionType: 'slack',
    configSchema: z.object({ connectionId: z.string().min(1), text: z.string().min(1) }),
    defaultConfig: { connectionId: '', text: '' },
    fields: [
      { name: 'connectionId', label: 'Slack connection', type: 'connection' },
      { name: 'text', label: 'Message', type: 'textarea' },
    ],
    handles: { source: ['out'], target: true },
  },

  discord_message: {
    key: 'discord_message',
    label: 'Discord message',
    kind: 'ACTION',
    description: 'Post a message to Discord via a stored connection.',
    connectionType: 'discord',
    configSchema: z.object({ connectionId: z.string().min(1), content: z.string().min(1) }),
    defaultConfig: { connectionId: '', content: '' },
    fields: [
      { name: 'connectionId', label: 'Discord connection', type: 'connection' },
      { name: 'content', label: 'Message', type: 'textarea' },
    ],
    handles: { source: ['out'], target: true },
  },

  telegram_message: {
    key: 'telegram_message',
    label: 'Telegram message',
    kind: 'ACTION',
    description: 'Send a Telegram message via a bot connection.',
    connectionType: 'telegram',
    configSchema: z.object({
      connectionId: z.string().min(1),
      chatId: z.string().min(1),
      text: z.string().min(1),
    }),
    defaultConfig: { connectionId: '', chatId: '', text: '' },
    fields: [
      { name: 'connectionId', label: 'Telegram connection', type: 'connection' },
      { name: 'chatId', label: 'Chat ID', type: 'text' },
      { name: 'text', label: 'Message', type: 'textarea' },
    ],
    handles: { source: ['out'], target: true },
  },

  airtable_create: {
    key: 'airtable_create',
    label: 'Airtable record',
    kind: 'ACTION',
    description: 'Create a record in an Airtable table.',
    connectionType: 'airtable',
    configSchema: z.object({
      connectionId: z.string().min(1),
      baseId: z.string().min(1),
      table: z.string().min(1),
      fields: z.string().optional(),
    }),
    defaultConfig: { connectionId: '', baseId: '', table: '', fields: '{}' },
    fields: [
      { name: 'connectionId', label: 'Airtable connection', type: 'connection' },
      { name: 'baseId', label: 'Base ID', type: 'text', placeholder: 'app...' },
      { name: 'table', label: 'Table', type: 'text' },
      { name: 'fields', label: 'Fields (JSON)', type: 'textarea', placeholder: '{"Name":"{{trigger.name}}"}' },
    ],
    handles: { source: ['out'], target: true },
  },

  notion_create: {
    key: 'notion_create',
    label: 'Notion page',
    kind: 'ACTION',
    description: 'Create a page in a Notion database.',
    connectionType: 'notion',
    configSchema: z.object({
      connectionId: z.string().min(1),
      databaseId: z.string().min(1),
      title: z.string().min(1),
    }),
    defaultConfig: { connectionId: '', databaseId: '', title: '' },
    fields: [
      { name: 'connectionId', label: 'Notion connection', type: 'connection' },
      { name: 'databaseId', label: 'Database ID', type: 'text' },
      { name: 'title', label: 'Page title', type: 'text' },
    ],
    handles: { source: ['out'], target: true },
  },

  openai_complete: {
    key: 'openai_complete',
    label: 'AI completion',
    kind: 'ACTION',
    description: 'Generate text with an LLM; reference it as {{steps.<id>.text}}.',
    connectionType: 'openai',
    configSchema: z.object({
      connectionId: z.string().min(1),
      model: z.string().min(1),
      prompt: z.string().min(1),
    }),
    defaultConfig: { connectionId: '', model: 'gpt-4o-mini', prompt: '' },
    fields: [
      { name: 'connectionId', label: 'OpenAI connection', type: 'connection' },
      { name: 'model', label: 'Model', type: 'text', placeholder: 'gpt-4o-mini' },
      { name: 'prompt', label: 'Prompt', type: 'textarea' },
    ],
    handles: { source: ['out'], target: true },
  },

  set_data: {
    key: 'set_data',
    label: 'Set data',
    kind: 'ACTION',
    description: 'Define values for later steps via {{steps.<id>.<key>}}.',
    configSchema: z.object({ json: z.string().min(1) }),
    defaultConfig: { json: '{\n  "key": "value"\n}' },
    fields: [{ name: 'json', label: 'Data (JSON)', type: 'textarea' }],
    handles: { source: ['out'], target: true },
  },

  filter: {
    key: 'filter',
    label: 'Filter',
    kind: 'ACTION',
    description: 'Continue only when the condition holds; otherwise stop the run.',
    configSchema: z.object({
      field: z.string().min(1),
      operator: z.enum(['eq', 'neq', 'contains', 'gt', 'lt']),
      value: z.string(),
    }),
    defaultConfig: { field: '', operator: 'eq', value: '' },
    fields: [
      { name: 'field', label: 'Field', type: 'text', placeholder: 'trigger.status' },
      {
        name: 'operator',
        label: 'Operator',
        type: 'select',
        options: [
          { value: 'eq', label: 'equals' },
          { value: 'neq', label: 'not equals' },
          { value: 'contains', label: 'contains' },
          { value: 'gt', label: 'greater than' },
          { value: 'lt', label: 'less than' },
        ],
      },
      { name: 'value', label: 'Value', type: 'text' },
    ],
    handles: { source: ['out'], target: true },
  },

  delay: {
    key: 'delay',
    label: 'Delay',
    kind: 'ACTION',
    description: 'Wait for a fixed duration before continuing.',
    configSchema: z.object({ seconds: z.coerce.number().int().positive() }),
    defaultConfig: { seconds: 60 },
    fields: [{ name: 'seconds', label: 'Seconds', type: 'number', placeholder: '60' }],
    handles: { source: ['out'], target: true },
  },

  condition: {
    key: 'condition',
    label: 'Condition',
    kind: 'CONDITION',
    description: 'Branch on a true/false test.',
    configSchema: z.object({
      field: z.string().min(1),
      operator: z.enum(['eq', 'neq', 'contains', 'gt', 'lt']),
      value: z.string(),
    }),
    defaultConfig: { field: '', operator: 'eq', value: '' },
    fields: [
      { name: 'field', label: 'Field', type: 'text', placeholder: 'status' },
      {
        name: 'operator',
        label: 'Operator',
        type: 'select',
        options: [
          { value: 'eq', label: 'equals' },
          { value: 'neq', label: 'not equals' },
          { value: 'contains', label: 'contains' },
          { value: 'gt', label: 'greater than' },
          { value: 'lt', label: 'less than' },
        ],
      },
      { name: 'value', label: 'Value', type: 'text' },
    ],
    handles: { source: ['true', 'false'], target: true },
  },
}

export function getStepType(key: string): StepType {
  const t = STEP_TYPES[key]
  if (!t) throw new Error(`Unknown step type: ${key}`)
  return t
}

export function listStepTypes(): StepType[] {
  return Object.values(STEP_TYPES)
}
