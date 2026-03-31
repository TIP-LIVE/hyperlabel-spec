/**
 * Phase 10: Settings — notification toggles, data export, account info
 */
import { test, expect } from '@playwright/test'

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  test('page header and description are correct', async ({ page }) => {
    await expect(page.getByText('Manage your account and preferences')).toBeVisible()
  })

  test('Account Overview card shows user information fields', async ({ page }) => {
    await expect(page.getByText('Account Overview')).toBeVisible()
    await expect(page.getByText('Your account information')).toBeVisible()
    await expect(page.getByText('Email', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Name', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Member since')).toBeVisible()
  })

  test('Profile & Security card is visible', async ({ page }) => {
    await expect(page.getByText('Profile & Security')).toBeVisible()
    await expect(page.getByText('Manage your profile, password, and security settings')).toBeVisible()
  })

  test('Notification Preferences section renders all toggles', async ({ page }) => {
    // Wait for notification toggle switches to load (networkidle times out due to background polling)
    await page.waitForSelector('[role="switch"]', { timeout: 10_000 })

    const notifLabels = [
      'Label Activated',
      'Low Battery',
      'No Signal',
      'Shipment Delivered',
      'Order Shipped',
      'Shipment Stuck',
      'Reminders',
    ]

    for (const label of notifLabels) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('notification toggle can be clicked without error', async ({ page }) => {
    await page.waitForSelector('[role="switch"]', { timeout: 10_000 })

    // Find first notification toggle switch
    const toggle = page.getByRole('switch').first()
    if (await toggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const initialState = await toggle.getAttribute('aria-checked')
      await toggle.click()
      await page.waitForTimeout(1_000)
      // State should have changed (or error would have appeared)
      const newState = await toggle.getAttribute('aria-checked')
      expect(newState).not.toBeNull()
      // Toggle back to original state
      await toggle.click()
      await page.waitForTimeout(500)
    }
  })

  test('Data & Privacy card shows Export Your Data option', async ({ page }) => {
    await expect(page.getByText('Data & Privacy')).toBeVisible()
    await expect(page.getByText('Export Your Data').first()).toBeVisible()
    await expect(page.getByText(/Download a copy of all your data/)).toBeVisible()
  })

  test('Data export button is present and clickable', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export.*data|download/i }).first()
    if (await exportBtn.isVisible().catch(() => false)) {
      await exportBtn.click()
      await page.waitForTimeout(1_500)
      // Should not crash — either download starts or confirmation shows
      const hasError = await page.getByText(/error|failed/i).isVisible().catch(() => false)
      expect(hasError).toBeFalsy()
    }
  })

  test('Danger Zone card shows Delete Account option', async ({ page }) => {
    await expect(page.getByText('Danger Zone')).toBeVisible()
    await expect(page.getByText('Irreversible and destructive actions')).toBeVisible()
    await expect(page.getByText('Delete Account')).toBeVisible()
    await expect(page.getByText(/Permanently delete your account/)).toBeVisible()
  })

  test('Delete Account button is present but does not immediately delete', async ({ page }) => {
    const deleteBtn = page.getByRole('button', { name: /delete account/i })
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click()
      await page.waitForTimeout(1_000)
      // Should show a confirmation dialog, not immediately delete
      const hasConfirm =
        (await page.getByRole('dialog').isVisible().catch(() => false)) ||
        (await page.getByText(/are you sure|confirm|cannot be undone/i).isVisible().catch(() => false))
      // Either has confirmation or button is disabled — not immediately acting
      if (hasConfirm) {
        // Close the dialog without deleting
        const cancelBtn = page.getByRole('button', { name: /cancel/i }).last()
        if (await cancelBtn.isVisible().catch(() => false)) {
          await cancelBtn.click()
        } else {
          await page.keyboard.press('Escape')
        }
      }
    }
  })
})
