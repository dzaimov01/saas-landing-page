import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `run+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Run User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('webhook trigger executes a run end-to-end', async ({ page, request }) => {
  await signUp(page)

  // Create a workflow with a single webhook trigger.
  await page.getByRole('button', { name: /new workflow/i }).click()
  await page.waitForURL('**/app/workflows/**', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Webhook', exact: true }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)

  // Open the node to read its webhook URL.
  await page.locator('.react-flow__node').first().click()
  const webhookUrl = (await page.locator('code').first().textContent())?.trim()
  expect(webhookUrl).toContain('/api/hooks/')

  // Enable + save.
  await page.getByLabel('Status').selectOption('ENABLED')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 15_000 })

  // Fire the webhook.
  const res = await request.post(webhookUrl as string, { data: { hello: 'world' } })
  expect(res.status()).toBe(202)

  // The worker (started in global-setup) executes the run; poll the monitor.
  await expect(async () => {
    await page.goto('/app/runs')
    await expect(page.getByText('succeeded', { exact: true })).toBeVisible()
  }).toPass({ timeout: 30_000 })

  // Detail shows the trigger step succeeded.
  await page.getByText('succeeded', { exact: true }).first().click()
  await page.waitForURL('**/app/runs/**', { timeout: 15_000 })
  await expect(page.getByText('Webhook')).toBeVisible()
})
