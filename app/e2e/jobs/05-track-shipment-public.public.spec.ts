import { test, expect } from '@playwright/test'

test.describe('Track shipment via public link', () => {
  test('non-existent share code returns 404', async ({ page }) => {
    const response = await page.goto('/track/nonexistent-code-xyz')
    expect(response?.status()).toBe(404)
  })

  test('tracking route does not return 500', async ({ page }) => {
    const response = await page.goto('/track/test-code-123')
    expect(response?.status()).not.toBe(500)
  })
})
