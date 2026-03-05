import { test, expect } from '@playwright/test'

test.describe('Admin user management', () => {
  test('user management page shows heading and search', async ({ page }) => {
    await page.goto('/admin/users')
    const isAdmin = page.url().includes('/admin/users')
    if (isAdmin) {
      await expect(
        page.getByRole('heading', { name: 'User Management' })
      ).toBeVisible()
      await expect(page.getByText('View and manage registered users')).toBeVisible()
      await expect(
        page.getByPlaceholder('Search by email or name...')
      ).toBeVisible()
    }
  })

  test('shows users table with correct columns', async ({ page }) => {
    await page.goto('/admin/users')
    const isAdmin = page.url().includes('/admin/users')
    if (isAdmin) {
      await expect(page.getByText(/All Users \(\d+\)/)).toBeVisible()

      const table = page.locator('table')
      const emptyState = page.getByText('No users found')
      const hasContent =
        (await table.isVisible().catch(() => false)) ||
        (await emptyState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()

      if (await table.isVisible().catch(() => false)) {
        await expect(page.getByText('Email', { exact: true })).toBeVisible()
        await expect(page.getByText('Name', { exact: true })).toBeVisible()
        await expect(page.getByText('Role', { exact: true })).toBeVisible()
        await expect(page.getByText('Orders', { exact: true })).toBeVisible()
        await expect(page.getByText('Shipments', { exact: true })).toBeVisible()
        await expect(page.getByText('Joined', { exact: true })).toBeVisible()
        await expect(page.getByText('Actions', { exact: true })).toBeVisible()
      }
    }
  })
})
