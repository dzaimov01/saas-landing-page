import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  webServer: {
    command: 'npm run build && npx next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5433/cadence?schema=public',
      REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6380',
      AUTH_SECRET: process.env.AUTH_SECRET ?? 'dev-secret-dev-secret-dev-secret-123',
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? 'Lm5hFbtQl55RMPubYIcCcLN666+h5tL8KahFRr1KYVU=',
      DISABLE_RATE_LIMIT: '1',
      APP_URL: 'http://localhost:3100',
    },
  },
})
