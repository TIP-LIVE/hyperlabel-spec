import { test, expect } from '@playwright/test'

test.describe('Read legal pages', () => {
  test('terms page loads with heading', async ({ page }) => {
    const response = await page.goto('/terms')
    expect(response?.status()).not.toBe(500)
    await expect(
      page.getByRole('heading', { name: /terms of service/i })
    ).toBeVisible()
  })

  test('privacy page loads with heading', async ({ page }) => {
    const response = await page.goto('/privacy')
    expect(response?.status()).not.toBe(500)
    await expect(
      page.getByRole('heading', { name: /privacy policy/i })
    ).toBeVisible()
  })

  test('footer links navigate to legal pages', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer')

    // Terms
    await footer.getByRole('link', { name: 'Terms' }).click()
    await expect(page).toHaveURL(/\/terms/)
    await expect(
      page.getByRole('heading', { name: /terms of service/i })
    ).toBeVisible()

    // Go back and click Privacy
    await page.goto('/')
    await page.locator('footer').getByRole('link', { name: 'Privacy' }).click()
    await expect(page).toHaveURL(/\/privacy/)
    await expect(
      page.getByRole('heading', { name: /privacy policy/i })
    ).toBeVisible()
  })
})
