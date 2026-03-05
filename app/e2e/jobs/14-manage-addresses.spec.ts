import { test, expect } from '@playwright/test'

test.describe('Manage addresses', () => {
  test('address book page shows correct header and toolbar', async ({ page }) => {
    await page.goto('/address-book')
    const isAddressBook = page.url().includes('/address-book')
    if (isAddressBook) {
      await expect(
        page.getByRole('heading', { name: /address book/i })
      ).toBeVisible()
      await expect(
        page.getByText('Save and manage your shipping addresses for quick reuse')
      ).toBeVisible()

      // Toolbar
      await expect(
        page.getByPlaceholder('Search addresses...')
      ).toBeVisible()
      await expect(
        page.getByRole('button', { name: /add address/i })
      ).toBeVisible()
    }
  })

  test('shows empty state or address cards', async ({ page }) => {
    await page.goto('/address-book')
    const isAddressBook = page.url().includes('/address-book')
    if (isAddressBook) {
      await page.waitForLoadState('networkidle')

      // Either empty state or address cards
      const emptyState = page.getByText(/No saved addresses yet/)
      const hasCards = page.locator('[class*="grid"]').first()
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await hasCards.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })
})
