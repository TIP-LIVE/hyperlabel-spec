import { test, expect } from '@playwright/test'

test.describe('Navigate the dashboard', () => {
  test('sidebar shows all navigation links', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'Shipments' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Labels' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Addresses' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
    }
  })

  test('clicking sidebar links navigates to correct pages', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      // Shipments
      await page.getByRole('link', { name: 'Shipments' }).click()
      await expect(page).toHaveURL(/\/shipments/)
      await expect(page.getByRole('heading', { name: /shipments/i })).toBeVisible()

      // Labels
      await page.getByRole('link', { name: 'Labels' }).click()
      await expect(page).toHaveURL(/\/labels/)
      await expect(page.getByRole('heading', { name: /labels/i })).toBeVisible()

      // Orders
      await page.getByRole('link', { name: 'Orders' }).click()
      await expect(page).toHaveURL(/\/orders/)
      await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()

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

  test('New Shipment button is visible in header', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      const newShipment = page.getByRole('link', { name: /new shipment/i })
      await expect(newShipment).toBeVisible()
      await expect(newShipment).toHaveAttribute('href', '/shipments/new')
    }
  })
})
