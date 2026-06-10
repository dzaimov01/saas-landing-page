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
    description: 'Post a message via a Slack incoming webhook.',
    configSchema: z.object({
      webhookUrl: z.string().url(),
      text: z.string().min(1),
    }),
    defaultConfig: { webhookUrl: '', text: '' },
    fields: [
      {
        name: 'webhookUrl',
        label: 'Slack webhook URL',
        type: 'text',
        placeholder: 'https://hooks.slack.com/services/...',
      },
      { name: 'text', label: 'Message', type: 'textarea' },
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
