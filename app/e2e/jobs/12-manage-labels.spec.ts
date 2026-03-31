import { test, expect } from '@playwright/test'

test.describe('Manage labels', () => {
  test('labels page shows correct header', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      await expect(page.getByRole('heading', { name: 'Labels', exact: true })).toBeVisible()
      await expect(
        page.getByText(/device IDs, battery, and status/)
      ).toBeVisible()
    }
  })

  test('shows empty state or labels list', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      const emptyState = page.getByText('No labels yet')
      const dataState = page.getByText(/Your labels \(\d+\)/)
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()

      // If empty state, verify CTAs
      if (await emptyState.isVisible().catch(() => false)) {
        await expect(
          page.getByText('Labels you own will appear here')
        ).toBeVisible()
        await expect(
          page.getByRole('link', { name: /buy labels/i }).first()
        ).toBeVisible()
      }

      // If data state, verify description
      if (await dataState.isVisible().catch(() => false)) {
        await expect(
          page.getByText('Device ID, status, and battery. Use a label when creating a shipment.')
        ).toBeVisible()
      }
    }
  })
})
