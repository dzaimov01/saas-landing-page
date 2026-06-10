import type { Connector } from './types'
import { httpRequest } from './http'
import { sendEmailConnector } from './email'
import { slackMessage } from './slack'
import { discordMessage } from './discord'
import { telegramMessage } from './telegram'
import { airtableCreate } from './airtable'
import { notionCreate } from './notion'
import { openaiComplete } from './openai'
import { setData } from './setdata'
import { filter } from './filter'
import { delay } from './delay'

export const CONNECTORS: Record<string, Connector> = {
  http_request: httpRequest,
  send_email: sendEmailConnector,
  slack_message: slackMessage,
  discord_message: discordMessage,
  telegram_message: telegramMessage,
  airtable_create: airtableCreate,
  notion_create: notionCreate,
  openai_complete: openaiComplete,
  set_data: setData,
  filter,
  delay,
}

export function getConnector(type: string): Connector {
  const c = CONNECTORS[type]
  if (!c) throw new Error(`No connector for action type "${type}"`)
  return c
}
