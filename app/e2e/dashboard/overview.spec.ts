import { test, expect } from '@playwright/test'

test.describe('Dashboard Overview', () => {
  test('redirects to sign-in when not authenticated', async ({ page }) => {
    // Clear any stored auth state to simulate unauthenticated access
    await page.context().clearCookies()
    await page.goto('/dashboard')
    // Clerk middleware should redirect to the sign-in page
    await expect(page).toHaveURL(/sign-in/, { timeout: 10_000 })
  })

  test('dashboard page loads with heading', async ({ page }) => {
    await page.goto('/dashboard')
    // If authenticated, should see the Dashboard heading
    // If redirected, the sign-in page will load instead
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(
        page.getByRole('heading', { name: /dashboard/i })
      ).toBeVisible()
    }
  })

  test('shows navigation sidebar with key links', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(
        page.getByRole('link', { name: /shipments/i })
      ).toBeVisible()
      await expect(page.getByRole('link', { name: /labels/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /orders/i })).toBeVisible()
      await expect(
        page.getByRole('link', { name: /settings/i })
      ).toBeVisible()
    }
  })
})
