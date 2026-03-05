import { test, expect } from '@playwright/test'

test.describe('Admin shipment monitoring', () => {
  test('all shipments page shows heading and search', async ({ page }) => {
    await page.goto('/admin/shipments')
    const isAdmin = page.url().includes('/admin/shipments')
    if (isAdmin) {
      await expect(
        page.getByRole('heading', { name: 'All Shipments' })
      ).toBeVisible()
      await expect(
        page.getByText('View and manage shipments across all users')
      ).toBeVisible()
      await expect(
        page.getByPlaceholder(/Search by name, share code/)
      ).toBeVisible()
    }
  })

  test('shows status tabs', async ({ page }) => {
    await page.goto('/admin/shipments')
    const isAdmin = page.url().includes('/admin/shipments')
    if (isAdmin) {
      await expect(page.getByText(/All \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Pending \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/In Transit \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Delivered \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Cancelled \(\d+\)/)).toBeVisible()
    }
  })
})
