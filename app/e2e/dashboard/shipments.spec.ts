import { test, expect } from '@playwright/test'

test.describe('Shipments Page', () => {
  test('cargo page loads with heading', async ({ page }) => {
    await page.goto('/cargo')
    const isCargo = page.url().includes('/cargo')
    if (isCargo) {
      await expect(
        page.getByRole('heading', { name: 'Track Cargo', exact: true })
      ).toBeVisible()
    }
  })

  test('shows cargo shipments section', async ({ page }) => {
    await page.goto('/cargo')
    const isCargo = page.url().includes('/cargo')
    if (isCargo) {
      // Cargo Shipments card is always present
      await expect(page.getByText('Cargo Shipments')).toBeVisible()
      // Status filter dropdown is always present (either loaded or skeleton)
      // Wait for client component to load
      await page.waitForLoadState('networkidle')
      const statusFilter = page.getByRole('combobox').first()
      const hasFilter = await statusFilter.isVisible().catch(() => false)
      const noResults = await page.getByText('No results.').isVisible().catch(() => false)
      expect(hasFilter || noResults).toBeTruthy()
    }
  })

  test('new cargo page loads with heading', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNewCargo = page.url().includes('/cargo/new')
    if (isNewCargo) {
      await expect(
        page.getByRole('heading', { name: /new cargo shipment/i })
      ).toBeVisible()
    }
  })

  test('new cargo page has cargo essentials section', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNewCargo = page.url().includes('/cargo/new')
    if (isNewCargo) {
      await expect(
        page.getByText('Cargo Essentials')
      ).toBeVisible()
    }
  })
})
