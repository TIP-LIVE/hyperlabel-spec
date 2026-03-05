import { test, expect } from '@playwright/test'

test.describe('Admin Orders Page', () => {
  test('page loads or redirects appropriately', async ({ page }) => {
    const response = await page.goto('/admin/orders')
    // Should not be a server error
    expect(response?.status()).not.toBe(500)
  })

  test('shows order management heading when accessible', async ({ page }) => {
    await page.goto('/admin/orders')
    const isAdminOrders = page.url().includes('/admin/orders')
    if (isAdminOrders) {
      await expect(
        page.getByRole('heading', { name: /order management/i })
      ).toBeVisible()
    }
  })
})
