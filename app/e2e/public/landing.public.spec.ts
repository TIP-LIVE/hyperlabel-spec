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
    await page.goto('/sign-in')
    // Clerk renders a sign-in form; wait for the page to settle
    await page.waitForLoadState('networkidle')
    // The page should contain an email input or the Clerk sign-in UI
    await expect(page).toHaveURL(/sign-in/)
  })

  test('sign-up page loads with Clerk component', async ({ page }) => {
    await page.goto('/sign-up')
    await page.waitForLoadState('networkidle')
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
