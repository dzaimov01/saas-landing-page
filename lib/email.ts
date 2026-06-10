import { Resend } from 'resend'
import { env } from './env'
import { logger } from './logger'

type SendArgs = { to: string; subject: string; html: string }

export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  if (!env.RESEND_API_KEY) {
    // Dev fallback: no provider configured — log so links are usable locally.
    logger.info('email (dev fallback)', { to, subject, html })
    return
  }
  const resend = new Resend(env.RESEND_API_KEY)
  await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html })
}

export function actionLinkEmail(title: string, url: string, cta: string): string {
  return `<h2>${title}</h2><p><a href="${url}">${cta}</a></p><p>${url}</p>`
}
