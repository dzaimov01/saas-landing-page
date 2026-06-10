import type { Connector } from './types'
import { sendEmail } from '../email'

export const sendEmailConnector: Connector = async (config) => {
  const to = String(config.to ?? '')
  const subject = String(config.subject ?? '')
  const body = String(config.body ?? '')
  if (!to) throw new Error('Send email: missing recipient')
  await sendEmail({ to, subject, html: `<p>${body}</p>` })
  return { sent: true, to }
}
