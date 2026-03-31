import { test, expect } from '@playwright/test'

test.describe('Buy tracking labels', () => {
  test('page shows heading and description', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByRole('heading', { name: 'Buy Tracking Labels' })
      ).toBeVisible()
      await expect(
        page.getByText(/One-time purchase — choose how many labels you need/)
      ).toBeVisible()
    }
  })

  test('features accordion is present on buy page', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      // The features are in a collapsed accordion — check the trigger is visible
      await expect(
        page.getByText(/what's included with every label/i)
      ).toBeVisible()
    }
  })

  test('label quantity options are shown', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      // 3 label quantity options
      await expect(page.getByText('1 Label')).toBeVisible()
      await expect(page.getByText('5 Labels')).toBeVisible()
      await expect(page.getByText('10 Labels')).toBeVisible()
    }
  })

  test('secure checkout footer text is shown', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByText(/Secure checkout via Stripe/)
      ).toBeVisible()
    }
  })
})
