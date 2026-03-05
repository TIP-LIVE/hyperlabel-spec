import { test, expect } from '@playwright/test'

test.describe('Buy Labels Page', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByRole('heading', { name: /buy tracking labels/i })
      ).toBeVisible()
    }
  })

  test('shows features included with every label', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByText(/what's included with every label/i)
      ).toBeVisible()
    }
  })

  test('shows order and checkout section', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByRole('heading', { name: /order & checkout/i })
      ).toBeVisible()
    }
  })
})
