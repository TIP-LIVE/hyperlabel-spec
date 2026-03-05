import { test, expect } from '@playwright/test'

test.describe('Admin order management', () => {
  test('order management page shows heading and search', async ({ page }) => {
    await page.goto('/admin/orders')
    const isAdmin = page.url().includes('/admin/orders')
    if (isAdmin) {
      await expect(
        page.getByRole('heading', { name: 'Order Management' })
      ).toBeVisible()
      await expect(page.getByText('View and fulfill customer orders')).toBeVisible()
      await expect(
        page.getByPlaceholder('Search by email, order ID, tracking #...')
      ).toBeVisible()
    }
  })

  test('shows status tabs and orders table', async ({ page }) => {
    await page.goto('/admin/orders')
    const isAdmin = page.url().includes('/admin/orders')
    if (isAdmin) {
      // Status tabs
      await expect(page.getByText(/All \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Paid \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Shipped \(\d+\)/)).toBeVisible()
      await expect(page.getByText(/Delivered \(\d+\)/)).toBeVisible()

      // Table or empty state
      const table = page.locator('table')
      const emptyState = page.getByText('No orders found')
      const hasContent =
        (await table.isVisible().catch(() => false)) ||
        (await emptyState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()

      // If table visible, check column headers
      if (await table.isVisible().catch(() => false)) {
        await expect(page.getByText('Order', { exact: true }).first()).toBeVisible()
        await expect(page.getByText('Customer', { exact: true })).toBeVisible()
        await expect(page.getByText('Qty', { exact: true })).toBeVisible()
        await expect(page.getByText('Status', { exact: true }).first()).toBeVisible()
      }
    }
  })
})
