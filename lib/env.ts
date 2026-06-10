import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(16),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Cadence <onboarding@resend.dev>'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  REDIS_URL: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_TEAM_MONTHLY: z.string().optional(),
  STRIPE_PRICE_TEAM_ANNUAL: z.string().optional(),
  STRIPE_PRICE_SCALE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_SCALE_ANNUAL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

const raw = {
  DATABASE_URL: process.env.DATABASE_URL,
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  APP_URL: process.env.APP_URL,
  REDIS_URL: process.env.REDIS_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY,
  STRIPE_PRICE_TEAM_ANNUAL: process.env.STRIPE_PRICE_TEAM_ANNUAL,
  STRIPE_PRICE_SCALE_MONTHLY: process.env.STRIPE_PRICE_SCALE_MONTHLY,
  STRIPE_PRICE_SCALE_ANNUAL: process.env.STRIPE_PRICE_SCALE_ANNUAL,
  SENTRY_DSN: process.env.SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
}

/**
 * Validated, typed environment. At runtime this throws if required vars are missing,
 * so misconfiguration fails fast. During `next build` (no secrets available on the
 * build machine) validation is skipped so the app can be built before env is set.
 */
const isBuild = process.env.NEXT_PHASE === 'phase-production-build'

export const env = isBuild
  ? ({
      ...raw,
      EMAIL_FROM: raw.EMAIL_FROM ?? 'Cadence <onboarding@resend.dev>',
      APP_URL: raw.APP_URL ?? 'http://localhost:3000',
    } as z.infer<typeof schema>)
  : schema.parse(raw)
