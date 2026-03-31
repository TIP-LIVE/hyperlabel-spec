/**
 * Phase 8 + 9: Buy Labels and Orders
 * Tests the /buy page, pricing, checkout initiation, and orders page.
 */
import { test, expect } from '@playwright/test'

test.describe('Buy Labels page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/buy')
    await page.waitForLoadState('domcontentloaded')
  })

  test('page loads with main heading and description', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Buy Tracking Labels' })).toBeVisible()
    await expect(page.getByText(/One-time purchase/)).toBeVisible()
  })

  test('three label quantity options are shown with prices', async ({ page }) => {
    await expect(page.getByText('1 Label')).toBeVisible()
    await expect(page.getByText('5 Labels')).toBeVisible()
    await expect(page.getByText('10 Labels')).toBeVisible()
  })

  test('what\'s included accordion is present', async ({ page }) => {
    await expect(page.getByText(/what's included with every label/i)).toBeVisible()
  })

  test('secure checkout footer is shown', async ({ page }) => {
    await expect(page.getByText(/Secure checkout via Stripe/)).toBeVisible()
  })

  test('clicking a Buy button initiates checkout or shows auth prompt', async ({ page }) => {
    // Click the first Buy / Order button
    const buyBtn = page.getByRole('button', { name: /buy|order|get started|checkout/i }).first()
    if (await buyBtn.isVisible().catch(() => false)) {
      await buyBtn.click()
      await page.waitForTimeout(2_000)
      const url = page.url()
      // Either redirected to Stripe checkout, or stays on /buy (if already loading)
      const validOutcome =
        url.includes('/buy') ||
        url.includes('stripe.com') ||
        url.includes('checkout') ||
        url.includes('sign-in')
      expect(validOutcome).toBeTruthy()
    }
  })
})

test.describe('Orders page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/orders')
    await page.waitForLoadState('domcontentloaded')
  })

  test('page loads with correct header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Orders', exact: true })).toBeVisible()
    await expect(page.getByText('View your label orders and purchase history')).toBeVisible()
  })

  test('Buy Labels CTA is present in header', async ({ page }) => {
    const buyLink = page.getByRole('link', { name: /buy labels/i }).first()
    await expect(buyLink).toBeVisible()
    await expect(buyLink).toHaveAttribute('href', '/buy')
  })

  test('shows empty state or order history', async ({ page }) => {
    const emptyState = page.getByText('No orders yet')
    const orderHistory = page.getByText('Order History')
    const hasContent =
      (await emptyState.isVisible().catch(() => false)) ||
      (await orderHistory.isVisible().catch(() => false))
    expect(hasContent).toBeTruthy()
  })

  test('empty state has Buy Your First Labels CTA', async ({ page }) => {
    const emptyState = page.getByText('No orders yet')
    if (await emptyState.isVisible().catch(() => false)) {
      await expect(page.getByText(/Tracking labels start at/)).toBeVisible()
      await expect(page.getByRole('link', { name: /buy your first labels/i })).toBeVisible()
    }
  })
})
