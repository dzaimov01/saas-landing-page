import { test, expect, type Page } from '@playwright/test'

async function signUp(page: Page) {
  const email = `analytics+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('Analytics User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/app', { timeout: 30_000 })
}

test('analytics page renders (empty state for a new workspace)', async ({ page }) => {
  await signUp(page)
  await page.goto('/app/analytics')
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  await expect(page.getByText(/no runs yet/i)).toBeVisible()
})
