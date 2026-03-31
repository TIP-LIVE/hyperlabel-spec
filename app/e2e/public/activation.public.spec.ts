import { test, expect } from '@playwright/test'

test.describe('Label Activation Page', () => {
  test('shows invalid label message for bad device ID format', async ({
    page,
  }) => {
    await page.goto('/activate/INVALID-ID')
    // CardTitle renders as a div, not a heading element
    await expect(page.getByText(/invalid label/i)).toBeVisible()
  })

  test('shows label not found for unknown valid device ID', async ({
    page,
  }) => {
    await page.goto('/activate/TIP-999')
    // CardTitle renders as a div, not a heading element
    await expect(page.getByText(/label not found/i)).toBeVisible()
  })

  test('page loads without errors', async ({ page }) => {
    const response = await page.goto('/activate/TIP-001')
    // Should not be a server error
    expect(response?.status()).not.toBe(500)
  })
})
