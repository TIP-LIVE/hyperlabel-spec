import { test, expect } from '@playwright/test'

test.describe('Sign up and sign in', () => {
  test('sign-in page loads at /sign-in', async ({ page }) => {
    const response = await page.goto('/sign-in')
    expect(response?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-up page loads at /sign-up', async ({ page }) => {
    const response = await page.goto('/sign-up')
    expect(response?.status()).not.toBe(500)
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/sign-up/)
  })

  test('Get Started link from landing navigates to /sign-up', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).click()
    await expect(page).toHaveURL(/sign-up/)
  })

  test('Sign In link from landing navigates to /sign-in', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/sign-in/)
  })

  test('unauthenticated dashboard access redirects to sign-in', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })
  })
})
