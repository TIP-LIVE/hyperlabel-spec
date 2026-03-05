import { test, expect } from '@playwright/test'

test.describe('Public Tracking Page', () => {
  test('shows 404 for non-existent share code', async ({ page }) => {
    const response = await page.goto('/track/nonexistent-code-xyz')
    // The app calls notFound() for unknown share codes, resulting in a 404
    expect(response?.status()).toBe(404)
  })

  test('tracking route loads without errors', async ({ page }) => {
    const response = await page.goto('/track/test-code-123')
    // Should get either 404 (not found) or 200 (valid code) — not a 500
    expect(response?.status()).not.toBe(500)
  })
})
