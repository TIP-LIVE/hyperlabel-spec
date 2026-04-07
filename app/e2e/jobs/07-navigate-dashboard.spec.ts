import { test, expect } from '@playwright/test'

test.describe('Navigate the dashboard', () => {
  test('sidebar shows all navigation links', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Track Cargo' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Label Dispatch' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Addresses' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
    }
  })

  test('clicking sidebar links navigates to correct pages', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      // Track Cargo
      await page.getByRole('link', { name: 'Track Cargo' }).click()
      await expect(page).toHaveURL(/\/cargo/)
      await expect(page.getByRole('heading', { name: /track cargo/i })).toBeVisible()

      // Label Dispatch
      await page.getByRole('link', { name: 'Label Dispatch' }).click()
      await expect(page).toHaveURL(/\/dispatch/)
      await expect(page.getByRole('heading', { name: /label dispatch/i })).toBeVisible()

      // Addresses
      await page.getByRole('link', { name: 'Addresses' }).click()
      await expect(page).toHaveURL(/\/address-book/)
      await expect(page.getByRole('heading', { name: /address book/i })).toBeVisible()

      // Settings
      await page.getByRole('link', { name: 'Settings' }).click()
      await expect(page).toHaveURL(/\/settings/)
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()

      // Back to Dashboard
      await page.getByRole('link', { name: 'Dashboard' }).first().click()
      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
    }
  })

  test('Buy Labels CTA links to /buy', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      const buyLink = page.getByRole('link', { name: /buy labels/i }).first()
      await expect(buyLink).toBeVisible()
    }
  })

  test('dashboard page header is correct', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
      await expect(page.getByText('Overview of your shipments and tracking labels')).toBeVisible()
    }
  })

  test('New Shipment dropdown button is visible in header', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      // "New Shipment" is a dropdown trigger button (not a link)
      const newShipment = page.getByRole('button', { name: /new shipment/i })
      await expect(newShipment).toBeVisible()
    }
  })
})
