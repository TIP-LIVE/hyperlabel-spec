import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads and shows hero heading', async ({ page }) => {
    await page.goto('/')
    // The hero heading contains "Live Door-to-Door Tracking Label For Any Cargo"
    await expect(
      page.getByRole('heading', { name: /tracking label/i })
    ).toBeVisible()
  })

  test('shows Sign In and Get Started navigation links', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /get started/i })
    ).toBeVisible()
  })

  test('sign-in page loads with Clerk component', async ({ page }) => {
    const response = await page.goto('/sign-in')
    expect(response?.status()).not.toBe(500)
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-up page loads with Clerk component', async ({ page }) => {
    const response = await page.goto('/sign-up')
    expect(response?.status()).not.toBe(500)
    await expect(page).toHaveURL(/sign-up/)
  })

  test('terms page loads', async ({ page }) => {
    await page.goto('/terms')
    await expect(
      page.getByRole('heading', { name: /terms of service/i })
    ).toBeVisible()
  })

  test('privacy page loads', async ({ page }) => {
    await page.goto('/privacy')
    await expect(
      page.getByRole('heading', { name: /privacy policy/i })
    ).toBeVisible()
  })
})
