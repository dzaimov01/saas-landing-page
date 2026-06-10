import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `conn+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Conn User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('create a connection without leaking the secret', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/connections')
  await page.getByRole('button', { name: /add connection/i }).click()

  // Slack is the default type.
  await page.getByLabel('Name').fill('My Slack')
  const secret = 'https://hooks.slack.com/services/SECRET123'
  await page.getByLabel('Incoming webhook URL').fill(secret)
  await page.getByRole('button', { name: /save connection/i }).click()

  await expect(page.getByText('My Slack')).toBeVisible()
  // The secret value must not be present anywhere in the page.
  expect(await page.content()).not.toContain('SECRET123')
})

test('use a template to create a workflow', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/templates')
  await expect(page.getByRole('heading', { name: 'Templates' })).toBeVisible()

  await page
    .locator('div', { hasText: 'Webhook → Email alert' })
    .getByRole('button', { name: 'Use template' })
    .first()
    .click()

  await page.waitForURL('**/app/workflows/**', { timeout: 30_000 })
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
})
