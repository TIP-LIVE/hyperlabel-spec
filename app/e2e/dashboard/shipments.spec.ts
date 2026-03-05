import { test, expect } from '@playwright/test'

test.describe('Shipments Page', () => {
  test('shipments page loads with heading', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      await expect(
        page.getByRole('heading', { name: /shipments/i })
      ).toBeVisible()
    }
  })

  test('shows empty state or shipments list', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      // Should show either "No shipments yet" empty state or "All Shipments" table
      const emptyState = page.getByText(/no shipments yet/i)
      const shipmentsTable = page.getByRole('heading', {
        name: /all shipments/i,
      })
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await shipmentsTable.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('new shipment page loads with heading', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNewShipment = page.url().includes('/shipments/new')
    if (isNewShipment) {
      await expect(
        page.getByRole('heading', { name: /new shipment/i })
      ).toBeVisible()
    }
  })

  test('new shipment page has shipment details section', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNewShipment = page.url().includes('/shipments/new')
    if (isNewShipment) {
      await expect(
        page.getByRole('heading', { name: /shipment details/i })
      ).toBeVisible()
    }
  })
})
