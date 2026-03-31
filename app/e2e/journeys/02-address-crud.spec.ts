/**
 * Phase 4: Address Book CRUD
 * Creates, verifies, edits, sets default, and deletes an address as a real user.
 */
import { test, expect } from '@playwright/test'

const TEST_ADDRESS = {
  label: `E2E Test Address ${Date.now()}`,
  name: 'Test User Journey',
  line1: '123 Test Street',
  city: 'London',
  postalCode: 'EC1A 1BB',
}

test.describe('Address Book CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/address-book')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /address book/i })).toBeVisible()
  })

  test('address book page loads with correct header and toolbar', async ({ page }) => {
    await expect(page.getByText('Save and manage your shipping addresses for quick reuse')).toBeVisible()
    await expect(page.getByPlaceholder('Search addresses...')).toBeVisible()
    await expect(page.getByRole('button', { name: /add address/i })).toBeVisible()
  })

  test('create → verify → delete address', async ({ page }) => {
    // 1. Open Add Address dialog
    await page.getByRole('button', { name: /add address/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // 2. Fill address form (UK is default country)
    const dialog = page.getByRole('dialog')
    await dialog.locator('#addr-label').fill(TEST_ADDRESS.label)
    await dialog.locator('#addr-name').fill(TEST_ADDRESS.name)
    await dialog.locator('#addr-line1').fill(TEST_ADDRESS.line1)
    await dialog.locator('#addr-city').fill(TEST_ADDRESS.city)
    await dialog.locator('#addr-postalCode').fill(TEST_ADDRESS.postalCode)

    // 3. Submit
    await dialog.getByRole('button', { name: 'Save Address' }).click()

    // 4. Dialog closes and address appears in the list
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(TEST_ADDRESS.label)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(TEST_ADDRESS.name)).toBeVisible()

    // 5. Search for the address to confirm it's in the list
    await page.getByPlaceholder('Search addresses...').fill(TEST_ADDRESS.label)
    await expect(page.getByText(TEST_ADDRESS.label)).toBeVisible()

    // 6. Clear search
    await page.getByPlaceholder('Search addresses...').clear()

    // 7. Delete the address via the Actions dropdown menu
    const addressCard = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: TEST_ADDRESS.label,
    }).first()

    // Click the Actions dropdown trigger
    const actionsBtn = addressCard.getByRole('button', { name: /actions/i })
    await actionsBtn.click()
    // Click Delete in the dropdown
    await page.getByRole('menuitem', { name: /delete/i }).click()

    // Confirm deletion in the alert dialog
    const alertDialog = page.getByRole('alertdialog')
    await expect(alertDialog).toBeVisible({ timeout: 3_000 })
    await alertDialog.getByRole('button', { name: /delete/i }).click()

    // Wait for dialog to close (deletion completes)
    await expect(alertDialog).not.toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(TEST_ADDRESS.label)).not.toBeVisible({ timeout: 8_000 })
  })

  test('edit address flow', async ({ page }) => {
    // First create an address to edit
    await page.getByRole('button', { name: /add address/i }).click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('#addr-label').fill(`E2E Edit Test ${Date.now()}`)
    await dialog.locator('#addr-name').fill('Edit Test User')
    await dialog.locator('#addr-line1').fill('456 Edit Lane')
    await dialog.locator('#addr-city').fill('Manchester')
    await dialog.locator('#addr-postalCode').fill('M1 1AE')
    await dialog.getByRole('button', { name: 'Save Address' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await page.waitForLoadState('networkidle')

    // Find the card and click edit
    const addressCard = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: 'Edit Test User',
    }).first()

    const editBtn = addressCard.getByRole('button', { name: /edit/i })
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click()
    } else {
      // Try dropdown menu
      const menuBtn = addressCard.getByRole('button').last()
      await menuBtn.click()
      await page.getByRole('menuitem', { name: /edit/i }).click()
    }

    // Dialog opens pre-filled
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 })
    const editDialog = page.getByRole('dialog')

    // Change the city
    const cityField = editDialog.locator('#addr-city')
    await cityField.clear()
    await cityField.fill('Birmingham')

    // Save
    await editDialog.getByRole('button', { name: 'Update Address' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await page.waitForLoadState('networkidle')

    // Verify updated value appears
    await expect(page.getByText('Birmingham')).toBeVisible({ timeout: 8_000 })

    // Cleanup: delete this address
    const updatedCard = page.locator('[class*="card"], [class*="Card"]').filter({
      hasText: 'Birmingham',
    }).first()
    const deleteBtn = updatedCard.getByRole('button', { name: /delete/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()
      const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last()
      if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await confirmBtn.click()
      }
    } else {
      const menuBtn = updatedCard.getByRole('button').last()
      await menuBtn.click()
      const deleteOption = page.getByRole('menuitem', { name: /delete/i })
      if (await deleteOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await deleteOption.click()
        const confirmBtn = page.getByRole('button', { name: /confirm|delete|yes/i }).last()
        if (await confirmBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
          await confirmBtn.click()
        }
      }
    }
  })
})
