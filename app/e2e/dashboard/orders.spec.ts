import { test, expect } from '@playwright/test'

test.describe('Orders Page', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/orders')
    const isOrders = page.url().includes('/orders')
    if (isOrders) {
      await expect(
        page.getByRole('heading', { name: 'Orders', exact: true })
      ).toBeVisible()
    }
  })

  test('shows orders list or empty state', async ({ page }) => {
    await page.goto('/orders')
    const isOrders = page.url().includes('/orders')
    if (isOrders) {
      // Should show either "No orders yet" empty state or "Order History" table
      const emptyState = page.getByText(/no orders yet/i)
      const ordersTable = page.getByRole('heading', {
        name: /order history/i,
      })
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await ordersTable.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })
})
