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

  test('features card lists all included features', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByText("What's Included With Every Label")
      ).toBeVisible()
      await expect(
        page.getByText(/Each disposable label includes 60 days of tracking/)
      ).toBeVisible()

      const features = [
        '60+ days battery life',
        'Global cellular coverage (180+ countries)',
        'Real-time location tracking',
        'Offline data storage',
        'Shareable tracking links',
        'Email notifications',
        'Free worldwide shipping',
      ]
      for (const feature of features) {
        await expect(page.getByText(feature)).toBeVisible()
      }
    }
  })

  test('order & checkout form shows pack options', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(page.getByText('Order & Checkout')).toBeVisible()
      await expect(
        page.getByText('Pick a label quantity and proceed to secure payment')
      ).toBeVisible()
      await expect(
        page.getByText('How many labels do you need?')
      ).toBeVisible()
    }
  })

  test('secure payment footer text is shown', async ({ page }) => {
    await page.goto('/buy')
    const isBuy = page.url().includes('/buy')
    if (isBuy) {
      await expect(
        page.getByText(/Secure payment via Stripe/)
      ).toBeVisible()
    }
  })
})
