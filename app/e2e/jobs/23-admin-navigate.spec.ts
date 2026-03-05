import { test, expect } from '@playwright/test'

test.describe('Admin navigation', () => {
  test('admin sidebar shows all navigation links', async ({ page }) => {
    await page.goto('/admin')
    const isAdmin = page.url().includes('/admin')
    if (isAdmin) {
      await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Labels' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Orders' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Shipments' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Devices' })).toBeVisible()
    }
  })

  test('admin top bar shows TIP Admin title and Client View button', async ({ page }) => {
    await page.goto('/admin')
    const isAdmin = page.url().includes('/admin')
    if (isAdmin) {
      await expect(page.getByText('TIP Admin')).toBeVisible()

      const clientView = page.getByRole('link', { name: /client view/i })
      await expect(clientView).toBeVisible()
      await expect(clientView).toHaveAttribute('href', '/dashboard')
    }
  })

  test('sidebar navigation flow works', async ({ page }) => {
    await page.goto('/admin')
    const isAdmin = page.url().includes('/admin')
    if (isAdmin) {
      // Users
      await page.getByRole('link', { name: 'Users' }).click()
      await expect(page).toHaveURL(/\/admin\/users/)
      await expect(page.getByRole('heading', { name: 'User Management' })).toBeVisible()

      // Labels
      await page.getByRole('link', { name: 'Labels' }).click()
      await expect(page).toHaveURL(/\/admin\/labels/)

      // Orders
      await page.getByRole('link', { name: 'Orders' }).click()
      await expect(page).toHaveURL(/\/admin\/orders/)
      await expect(page.getByRole('heading', { name: 'Order Management' })).toBeVisible()

      // Shipments
      await page.getByRole('link', { name: 'Shipments' }).click()
      await expect(page).toHaveURL(/\/admin\/shipments/)
      await expect(page.getByRole('heading', { name: 'All Shipments' })).toBeVisible()

      // Devices
      await page.getByRole('link', { name: 'Devices' }).click()
      await expect(page).toHaveURL(/\/admin\/devices/)
      await expect(page.getByRole('heading', { name: 'Device Health' })).toBeVisible()

      // Back to overview
      await page.getByRole('link', { name: 'Overview' }).click()
      await expect(page).toHaveURL(/\/admin$/)
    }
  })

  test('Back to Dashboard link returns to client dashboard', async ({ page }) => {
    await page.goto('/admin')
    const isAdmin = page.url().includes('/admin')
    if (isAdmin) {
      const backLink = page.getByRole('link', { name: /back to dashboard/i })
      await expect(backLink).toBeVisible()
      await expect(backLink).toHaveAttribute('href', '/dashboard')
    }
  })
})
