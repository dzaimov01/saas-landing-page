import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `wf+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('WF User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('build, save, and reload a workflow', async ({ page }) => {
  await signUp(page)

  // Create + open the builder
  await page.getByRole('button', { name: /new workflow/i }).click()
  await page.waitForURL('**/app/workflows/**', { timeout: 30_000 })
  await expect(page.locator('.react-flow')).toBeVisible()

  // Add a trigger + an action from the palette (wait for each to render)
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.getByRole('button', { name: 'HTTP request', exact: true }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(2)

  // Save (draft — no validation required)
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved')).toBeVisible({ timeout: 15_000 })

  // Back to the list — workflow appears
  await page.getByRole('link', { name: /workflows/i }).first().click()
  await page.waitForURL('**/app', { timeout: 15_000 })
  await expect(page.getByText('Untitled workflow')).toBeVisible()

  // Reopen — nodes persisted
  await page.getByRole('link', { name: 'Open' }).first().click()
  await page.waitForURL('**/app/workflows/**', { timeout: 15_000 })
  await expect(page.locator('.react-flow__node')).toHaveCount(2)
})

test('schedule trigger shows a human-readable description and preset', async ({ page }) => {
  await signUp(page)
  await page.getByRole('button', { name: /new workflow/i }).click()
  await page.waitForURL('**/app/workflows/**', { timeout: 30_000 })
  await expect(page.locator('.react-flow')).toBeVisible()

  // Add a Schedule trigger and open its config panel.
  await page.getByRole('button', { name: 'Schedule', exact: true }).click()
  await expect(page.locator('.react-flow__node')).toHaveCount(1)
  await page.locator('.react-flow__node').first().click()

  // The dedicated schedule UI exposes a Frequency preset selector.
  await expect(page.getByLabel('Frequency')).toBeVisible()
  await page.getByLabel('Frequency').selectOption({ label: 'Every hour' })
  // The description/preview box renders a computed "Next run:" line for the preset.
  await expect(page.getByText(/next run:/i)).toBeVisible()
  await expect(page.locator('p.text-fog', { hasText: 'Every hour' })).toBeVisible()
})

test('enabling an empty workflow surfaces a validation error', async ({ page }) => {
  await signUp(page)
  await page.getByRole('button', { name: /new workflow/i }).click()
  await page.waitForURL('**/app/workflows/**', { timeout: 30_000 })
  await page.getByLabel('Status').selectOption('ENABLED')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/add a trigger/i)).toBeVisible()
})
