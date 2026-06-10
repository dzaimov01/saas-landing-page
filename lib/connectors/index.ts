import type { Connector } from './types'
import { httpRequest } from './http'
import { sendEmailConnector } from './email'
import { slackMessage } from './slack'
import { delay } from './delay'

export const CONNECTORS: Record<string, Connector> = {
  http_request: httpRequest,
  send_email: sendEmailConnector,
  slack_message: slackMessage,
  delay,
}

export function getConnector(type: string): Connector {
  const c = CONNECTORS[type]
  if (!c) throw new Error(`No connector for action type "${type}"`)
  return c
}
