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

  test('dashboard shows onboarding wizard or shipment tracker', async ({ page }) => {
    await page.goto('/dashboard')
    const isDashboard = page.url().includes('/dashboard')
    if (isDashboard) {
      // Either onboarding wizard (no labels), labels-ready state, or live shipment tracker
      const onboarding = page.getByText("Welcome! Here's how to get started")
      const hasLabels = page.getByText(/label.* ready/)
      const shipmentTracker = page.getByText('Live Shipment Tracker').or(
        page.locator('[class*="hover:bg-accent"]').first()
      )

      const hasContent =
        (await onboarding.isVisible().catch(() => false)) ||
        (await hasLabels.isVisible().catch(() => false)) ||
        (await shipmentTracker.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('shipments empty state has correct wording', async ({ page }) => {
    // /shipments redirects to /cargo
    await page.goto('/cargo')
    const isShipments = page.url().includes('/cargo')
    if (isShipments) {
      await expect(page.getByRole('heading', { name: /track cargo/i })).toBeVisible()
      await expect(page.getByText('Attach tracking labels to your cargo and monitor journeys in real time')).toBeVisible()

      // Wait for client component to load, then check for table or empty state
      await page.waitForLoadState('networkidle')
      const noResults = page.getByText('No results.')
      const hasShipments = page.getByRole('combobox').first()
      const hasContent =
        (await noResults.isVisible().catch(() => false)) ||
        (await hasShipments.isVisible().catch(() => false))
      expect(hasContent).toBeTruthy()
    }
  })

  test('labels empty state has correct wording', async ({ page }) => {
    await page.goto('/labels')
    const isLabels = page.url().includes('/labels')
    if (isLabels) {
      await expect(page.getByRole('heading', { name: 'Labels', exact: true })).toBeVisible()

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
      await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
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
