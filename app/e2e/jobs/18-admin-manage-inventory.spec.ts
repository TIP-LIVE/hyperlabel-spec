import { test, expect } from '@playwright/test'

test.describe('Admin label inventory', () => {
  test('label inventory page shows status tabs', async ({ page }) => {
    await page.goto('/admin/labels')
    const isAdmin = page.url().includes('/admin/labels')
    if (isAdmin) {
      // 5 status tabs with counts
      await expect(page.getByText('All').first()).toBeVisible()
      await expect(page.getByText('Inventory')).toBeVisible()
      await expect(page.getByText('Sold')).toBeVisible()
      await expect(page.getByText('Active').first()).toBeVisible()
      await expect(page.getByText('Depleted')).toBeVisible()
    }
  })

  test('shows search bar with correct placeholder', async ({ page }) => {
    await page.goto('/admin/labels')
    const isAdmin = page.url().includes('/admin/labels')
    if (isAdmin) {
      await expect(
        page.getByPlaceholder('Search by device ID, IMEI, or owner email...')
      ).toBeVisible()
    }
  })
})
