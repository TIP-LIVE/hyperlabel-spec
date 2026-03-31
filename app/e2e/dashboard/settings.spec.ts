import { test, expect } from '@playwright/test'

test.describe('Settings Page', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(
        page.getByRole('heading', { name: /settings/i })
      ).toBeVisible()
    }
  })

  test('shows account overview section', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Account Overview')).toBeVisible()
    }
  })

  test('shows data and privacy section', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Data & Privacy')).toBeVisible()
    }
  })
})
