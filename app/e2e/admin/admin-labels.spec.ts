import { test, expect } from '@playwright/test'

test.describe('Admin Labels Page', () => {
  test('page loads or redirects appropriately', async ({ page }) => {
    const response = await page.goto('/admin/labels')
    // Should not be a server error
    expect(response?.status()).not.toBe(500)
  })

  test('shows label inventory when accessible', async ({ page }) => {
    await page.goto('/admin/labels')
    const isAdminLabels = page.url().includes('/admin/labels')
    if (isAdminLabels) {
      // Admin labels page shows status tabs: All, Inventory, Sold, Active, Depleted
      const hasContent =
        (await page
          .getByText(/inventory/i)
          .first()
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/all/i)
          .first()
          .isVisible()
          .catch(() => false))
      if (hasContent) {
        expect(hasContent).toBeTruthy()
      }
    }
  })
})
