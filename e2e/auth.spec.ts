import { test, expect } from '@playwright/test'

test('a new user can sign up and reach the app', async ({ page }) => {
  const email = `e2e+${Date.now()}@example.com`
  await page.goto('/signup')
  await page.getByLabel('Name').fill('E2E User')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill('supersecret1')
  await page.getByRole('button', { name: /create account/i }).click()

  await page.waitForURL('**/app', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Workflows', exact: true })).toBeVisible()
  await expect(page.getByText(/verify your email/i)).toBeVisible()
})

test('the marketing page renders the hero CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /automate the busywork/i })).toBeVisible()
})

test('login rejects bad credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('nobody@example.com')
  await page.getByLabel('Password').fill('wrongpassword')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page.getByText(/invalid email or password/i)).toBeVisible()
})
