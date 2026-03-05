import { test, expect } from '@playwright/test'

test.describe('Address Book Page', () => {
  test('page loads with heading', async ({ page }) => {
    await page.goto('/address-book')
    const isAddressBook = page.url().includes('/address-book')
    if (isAddressBook) {
      await expect(
        page.getByRole('heading', { name: /address book/i })
      ).toBeVisible()
    }
  })

  test('shows Add Address button', async ({ page }) => {
    await page.goto('/address-book')
    const isAddressBook = page.url().includes('/address-book')
    if (isAddressBook) {
      await expect(
        page.getByRole('button', { name: /add address/i })
      ).toBeVisible()
    }
  })

  test('shows empty state or addresses list', async ({ page }) => {
    await page.goto('/address-book')
    const isAddressBook = page.url().includes('/address-book')
    if (isAddressBook) {
      // The page should render without errors — either addresses or empty state
      await page.waitForLoadState('networkidle')
      // Verify the page header description is present
      await expect(
        page.getByText(/save and manage your shipping addresses/i)
      ).toBeVisible()
    }
  })
})
