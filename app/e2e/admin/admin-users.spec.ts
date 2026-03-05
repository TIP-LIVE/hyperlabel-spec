import { test, expect } from '@playwright/test'

test.describe('Admin Users Page', () => {
  test('page loads or redirects appropriately', async ({ page }) => {
    const response = await page.goto('/admin/users')
    // Should not be a server error
    expect(response?.status()).not.toBe(500)
  })

  test('shows user management heading when accessible', async ({ page }) => {
    await page.goto('/admin/users')
    const isAdminUsers = page.url().includes('/admin/users')
    if (isAdminUsers) {
      await expect(
        page.getByRole('heading', { name: /user management/i })
      ).toBeVisible()
    }
  })
})
