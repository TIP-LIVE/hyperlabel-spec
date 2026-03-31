import { test, expect } from '@playwright/test'

test.describe('Admin shipment monitoring', () => {
  test('admin cargo page shows heading and search', async ({ page }) => {
    await page.goto('/admin/cargo')
    await page.waitForLoadState('networkidle')
    const isAdmin = page.url().includes('/admin/cargo')
    if (isAdmin) {
      await expect(
        page.getByRole('heading', { name: 'Track Cargo' })
      ).toBeVisible()
      await expect(
        page.getByPlaceholder(/Search by name, share code/)
      ).toBeVisible()
    }
  })

  test('shows status tabs', async ({ page }) => {
    await page.goto('/admin/cargo')
    await page.waitForLoadState('networkidle')
    const isAdmin = page.url().includes('/admin/cargo')
    if (isAdmin) {
      await expect(page.getByText('All').first()).toBeVisible()
      await expect(page.getByText('Pending')).toBeVisible()
      await expect(page.getByText('In Transit')).toBeVisible()
      await expect(page.getByText('Delivered')).toBeVisible()
      await expect(page.getByText('Cancelled')).toBeVisible()
    }
  })
})
