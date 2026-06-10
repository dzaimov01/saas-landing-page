import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `bill+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Bill User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('billing settings shows the Starter plan, usage, and config state', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/settings/billing')

  // Current plan is Starter for a new workspace.
  await expect(page.getByText('Current plan')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Billing' })).toBeVisible()
  await expect(page.getByText('Starter', { exact: true })).toBeVisible()

  // Usage meters render (the run meter label is unique to this page).
  await expect(page.getByText('Runs this month')).toBeVisible()

  // Stripe is unconfigured in the test env → the not-configured state shows.
  await expect(page.getByText(/billing isn.t configured yet/i)).toBeVisible()
})
