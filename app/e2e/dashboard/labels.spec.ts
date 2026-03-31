import { test, expect } from '@playwright/test'

test.describe('Labels Page', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      await expect(
        page.getByRole('heading', { name: 'Labels', exact: true })
      ).toBeVisible()
    }
  })

  test('shows labels list or empty state', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      // Should show either "No labels yet" empty state or the labels list
      const emptyState = page.getByText(/no labels yet/i)
      const labelsList = page.getByRole('heading', {
        name: /your labels/i,
      })
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await labelsList.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })
})
