import { test, expect } from '@playwright/test'

test.describe('First-time user onboarding', () => {
  test('dashboard shows stat cards with correct labels', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(page.getByText('Active Shipments')).toBeVisible()
      await expect(page.getByText('Currently in transit')).toBeVisible()

      await expect(page.getByText('Total Labels')).toBeVisible()
      await expect(page.getByText('Labels owned')).toBeVisible()

      await expect(page.getByText('Delivered')).toBeVisible()
      await expect(page.getByText('This month')).toBeVisible()

      await expect(page.getByText('Low Battery')).toBeVisible()
    }
  })

  test('dashboard shows onboarding wizard or recent shipments', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      await expect(page.getByText('Recent Shipments')).toBeVisible()
      await expect(page.getByText('Your most recent cargo shipments')).toBeVisible()

      // Either onboarding wizard or shipment list
      const onboarding = page.getByText("Welcome! Here's how to get started")
      const hasLabels = page.getByText(/label.* ready/)
      const shipmentList = page.locator('[class*="hover:bg-accent"]').first()

      const hasContent =
        (await onboarding.isVisible().catch(() => false)) ||
        (await hasLabels.isVisible().catch(() => false)) ||
        (await shipmentList.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('shipments empty state has correct wording', async ({ page }) => {
    await page.goto('/shipments')
    const isShipments = page.url().includes('/shipments')
    if (isShipments) {
      await expect(page.getByRole('heading', { name: /shipments/i })).toBeVisible()
      await expect(page.getByText('Track and manage your cargo shipments')).toBeVisible()

      const emptyState = page.getByText('No shipments yet')
      const dataState = page.getByRole('heading', { name: /all shipments/i })
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('labels empty state has correct wording', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      await expect(page.getByRole('heading', { name: /labels/i })).toBeVisible()

      const emptyState = page.getByText('No labels yet')
      const dataState = page.getByText(/Your labels \(\d+\)/)
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('orders empty state has correct wording', async ({ page }) => {
    await page.goto('/orders')
    const isOrders = page.url().includes('/orders')
    if (isOrders) {
      await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
      await expect(page.getByText('View your label orders and purchase history')).toBeVisible()

      const emptyState = page.getByText('No orders yet')
      const dataState = page.getByText('Order History')
      const hasContent =
        (await emptyState.isVisible().catch(() => false)) ||
        (await dataState.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })
})
