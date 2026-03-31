import { test, expect } from '@playwright/test'

test.describe('Manage orders', () => {
  test('orders page shows correct header and Buy Labels CTA', async ({ page }) => {
    await page.goto('/orders')
    const isOrders = page.url().includes('/orders')
    if (isOrders) {
      await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
      await expect(page.getByText('View your label orders and purchase history')).toBeVisible()

      const buyLabels = page.getByRole('link', { name: /buy labels/i }).first()
      await expect(buyLabels).toBeVisible()
      await expect(buyLabels).toHaveAttribute('href', '/buy')
    }
  })

  test('shows empty state or order history', async ({ page }) => {
    await page.goto('/orders')
    const isOrders = page.url().includes('/orders')
    if (isOrders) {
      const emptyState = page.getByText('No orders yet')
      const dataState = page.getByText('Order History')
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()

      // If empty, verify CTA wording
      if (await emptyState.isVisible().catch(() => false)) {
        await expect(
          page.getByText(/Tracking labels start at \$25 each/)
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: /buy your first labels/i })
        ).toBeVisible()
      }

      // If data, verify description
      if (await dataState.isVisible().catch(() => false)) {
        await expect(page.getByText('All your label purchases')).toBeVisible()
      }
    }
  })
})
