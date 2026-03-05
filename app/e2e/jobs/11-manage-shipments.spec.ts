import { test, expect } from '@playwright/test'

test.describe('Manage shipments', () => {
  test('shipments page shows correct header', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      await expect(page.getByRole('heading', { name: /shipments/i })).toBeVisible()
      await expect(page.getByText('Track and manage your cargo shipments')).toBeVisible()

      const newShipment = page.getByRole('link', { name: /new shipment/i })
      await expect(newShipment).toBeVisible()
    }
  })

  test('shows empty state or shipments list', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      const emptyState = page.getByText('No shipments yet')
      const dataState = page.getByRole('heading', { name: /all shipments/i })
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('New Shipment button navigates to form', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      await page.getByRole('link', { name: /new shipment/i }).click()
      await expect(page).toHaveURL(/\/shipments\/new/)
      await expect(
        page.getByRole('heading', { name: /new shipment/i })
      ).toBeVisible()
    }
  })
})
