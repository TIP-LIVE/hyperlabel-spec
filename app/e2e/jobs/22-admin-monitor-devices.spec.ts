import { test, expect } from '@playwright/test'

test.describe('Admin device health monitoring', () => {
  test('device health page shows heading and search', async ({ page }) => {
    await page.goto('/admin/devices')
    const isAdmin = page.url().includes('/admin/devices')
    if (isAdmin) {
      await expect(
        page.getByRole('heading', { name: 'Device Health' })
      ).toBeVisible()
      await expect(
        page.getByText('Monitor active tracking labels')
      ).toBeVisible()
      await expect(
        page.getByPlaceholder('Search by device ID or IMEI...')
      ).toBeVisible()
    }
  })

  test('shows health filter tabs', async ({ page }) => {
    await page.goto('/admin/devices')
    const isAdmin = page.url().includes('/admin/devices')
    if (isAdmin) {
      await expect(page.getByText('All').first()).toBeVisible()
      await expect(page.getByText('Healthy')).toBeVisible()
      await expect(page.getByText('Low Battery')).toBeVisible()
      await expect(page.getByText('No Signal')).toBeVisible()
    }
  })
})
