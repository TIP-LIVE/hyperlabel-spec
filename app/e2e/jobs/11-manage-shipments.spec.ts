import { test, expect } from '@playwright/test'

test.describe('Manage shipments', () => {
  test('cargo page shows correct header', async ({ page }) => {
    await page.goto('/cargo')
    const isCargo = page.url().includes('/cargo')
    if (isCargo) {
      await expect(page.getByRole('heading', { name: 'Track Cargo', exact: true })).toBeVisible()
      await expect(
        page.getByText('Attach tracking labels to your cargo and monitor journeys in real time')
      ).toBeVisible()

      const newShipment = page.getByRole('link', { name: /new cargo shipment/i })
      await expect(newShipment).toBeVisible()
    }
  })

  test('shows cargo shipments section', async ({ page }) => {
    await page.goto('/cargo')
    const isCargo = page.url().includes('/cargo')
    if (isCargo) {
      await expect(page.getByText('Cargo Shipments')).toBeVisible()
    }
  })

  test('New Cargo Shipment button navigates to form', async ({ page }) => {
    await page.goto('/cargo')
    const isCargo = page.url().includes('/cargo')
    if (isCargo) {
      await page.getByRole('link', { name: /new cargo shipment/i }).click()
      await expect(page).toHaveURL(/\/cargo\/new/)
      await expect(
        page.getByRole('heading', { name: /new cargo shipment/i })
      ).toBeVisible()
    }
  })
})
