import { test, expect } from '@playwright/test'

test.describe('Admin overview', () => {
  test('admin page loads or redirects without error', async ({ page }) => {
    const response = await page.goto('/admin')
    expect(response?.status()).not.toBe(500)
  })

  test('shows stat cards with correct labels and descriptions', async ({ page }) => {
    await page.goto('/admin')
    const isAdmin = page.url().includes('/admin')
    if (isAdmin) {
      // 4 stat cards
      await expect(page.getByText('Total Users')).toBeVisible()
      await expect(page.getByText('Registered accounts')).toBeVisible()

      await expect(page.getByText('Labels in Inventory')).toBeVisible()

      await expect(page.getByText('Total Orders')).toBeVisible()
      await expect(page.getByText(/pending fulfillment/)).toBeVisible()

      await expect(page.getByText('Active Shipments')).toBeVisible()

      // Quick action cards
      await expect(page.getByText('Recent Orders')).toBeVisible()
      await expect(page.getByText('Latest orders requiring attention')).toBeVisible()
      await expect(page.getByText('Low Battery Alerts')).toBeVisible()
      await expect(page.getByText('Labels with battery below 20%')).toBeVisible()

      // View all links
      const viewAllLinks = page.getByText('View all')
      expect(await viewAllLinks.count()).toBeGreaterThanOrEqual(2)
    }
  })
})
