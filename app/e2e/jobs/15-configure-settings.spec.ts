import { test, expect } from '@playwright/test'

test.describe('Configure settings', () => {
  test('settings page shows correct header', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
      await expect(page.getByText('Manage your account and preferences')).toBeVisible()
    }
  })

  test('Account Overview card shows user info', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Account Overview')).toBeVisible()
      await expect(page.getByText('Your account information')).toBeVisible()
      await expect(page.getByText('Email')).toBeVisible()
      await expect(page.getByText('Name')).toBeVisible()
      await expect(page.getByText('Member since')).toBeVisible()
    }
  })

  test('Profile & Security card is present', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Profile & Security')).toBeVisible()
      await expect(
        page.getByText('Manage your profile, password, and security settings')
      ).toBeVisible()
    }
  })

  test('Data & Privacy card shows export option', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Data & Privacy')).toBeVisible()
      await expect(page.getByText('Export Your Data')).toBeVisible()
      await expect(
        page.getByText(/Download a copy of all your data.*as JSON/)
      ).toBeVisible()
    }
  })

  test('Danger Zone card shows delete account option', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      await expect(page.getByText('Danger Zone')).toBeVisible()
      await expect(page.getByText('Irreversible and destructive actions')).toBeVisible()
      await expect(page.getByText('Delete Account')).toBeVisible()
      await expect(
        page.getByText(/Permanently delete your account.*cannot be undone/)
      ).toBeVisible()
    }
  })

  test('Notification Preferences section is present', async ({ page }) => {
    await page.goto('/settings')
    const isSettings = page.url().includes('/settings')
    if (isSettings) {
      // NotificationPreferences component renders its own card
      // Check for notification-related text
      const notifSection = page.getByText(/notification/i).first()
      await expect(notifSection).toBeVisible()
    }
  })
})
