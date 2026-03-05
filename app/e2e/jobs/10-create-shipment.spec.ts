import { test, expect } from '@playwright/test'

test.describe('Create a new shipment', () => {
  test('page shows heading and shipment details card', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNew = page.url().includes('/shipments/new')
    if (isNew) {
      await expect(
        page.getByRole('heading', { name: /new shipment/i })
      ).toBeVisible()
      await expect(
        page.getByText('Create a new shipment to start tracking your cargo')
      ).toBeVisible()
      await expect(
        page.getByRole('heading', { name: /shipment details/i })
      ).toBeVisible()
    }
  })

  test('shipment type toggle shows Track Cargo and Label Dispatch', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNew = page.url().includes('/shipments/new')
    if (isNew) {
      await expect(page.getByText('Track Cargo')).toBeVisible()
      await expect(page.getByText('Label Dispatch')).toBeVisible()

      // Default description for Track Cargo
      await expect(
        page.getByText(/Attach a single tracking label to your cargo/)
      ).toBeVisible()
    }
  })

  test('cargo tracking form shows all required fields', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNew = page.url().includes('/shipments/new')
    if (isNew) {
      // Cargo name field
      await expect(page.getByText('Cargo Name / ID')).toBeVisible()

      // Tracking Label section
      await expect(page.getByText('Tracking Label')).toBeVisible()

      // Action buttons
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create shipment/i })
      ).toBeVisible()
    }
  })

  test('label dispatch mode shows dispatch-specific fields', async ({ page }) => {
    await page.goto('/shipments/new')
    const isNew = page.url().includes('/shipments/new')
    if (isNew) {
      await page.getByText('Label Dispatch').click()

      await expect(
        page.getByText(/Ship multiple labels from your warehouse/)
      ).toBeVisible()
      await expect(page.getByText('Dispatch Name')).toBeVisible()
      await expect(page.getByText('Labels to Dispatch')).toBeVisible()
    }
  })
})
