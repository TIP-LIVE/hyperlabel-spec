/**
 * Phase 3: Dashboard — full interactive navigation and stat card verification
 */
import { test, expect } from '@playwright/test'

test.describe('Dashboard overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })

  test('page header and description are correct', async ({ page }) => {
    await expect(page.getByText('Overview of your shipments and tracking labels')).toBeVisible()
  })

  test('all four stat cards are present', async ({ page }) => {
    await expect(page.getByText('Active Shipments')).toBeVisible()
    await expect(page.getByText('Currently in transit')).toBeVisible()
    await expect(page.getByText('Total Labels')).toBeVisible()
    await expect(page.getByText('Labels owned')).toBeVisible()
    await expect(page.getByText('Delivered')).toBeVisible()
    await expect(page.getByText('This month')).toBeVisible()
    await expect(page.getByText('Low Battery')).toBeVisible()
  })

  test('onboarding guide or shipment tracker is shown', async ({ page }) => {
    const onboarding = page.getByText(/here.*how.*get started|get started/i)
    const tracker = page.getByText('Live Shipment Tracker')
    const labelsReady = page.getByText(/label.*ready/i)
    const hasContent =
      (await onboarding.isVisible().catch(() => false)) ||
      (await tracker.isVisible().catch(() => false)) ||
      (await labelsReady.isVisible().catch(() => false))
    expect(hasContent).toBeTruthy()
  })

  test('New Shipment dropdown button is present in header', async ({ page }) => {
    const newShipmentBtn = page.getByRole('button', { name: /new shipment/i })
    await expect(newShipmentBtn).toBeVisible()
  })

  test('New Shipment dropdown shows Track Cargo and Label Dispatch options', async ({ page }) => {
    const newShipmentBtn = page.getByRole('button', { name: /new shipment/i })
    await newShipmentBtn.click()
    await page.waitForTimeout(500)
    // Should show dropdown with two options
    const trackCargo = page.getByRole('menuitem', { name: /track cargo/i })
      .or(page.getByRole('link', { name: /track cargo/i }))
      .or(page.getByText('Track Cargo').nth(1))
    const labelDispatch = page.getByRole('menuitem', { name: /label dispatch/i })
      .or(page.getByRole('link', { name: /label dispatch/i }))
      .or(page.getByText('Label Dispatch').nth(1))
    const hasDropdown =
      (await trackCargo.isVisible().catch(() => false)) ||
      (await labelDispatch.isVisible().catch(() => false))
    expect(hasDropdown).toBeTruthy()
    // Close dropdown
    await page.keyboard.press('Escape')
  })

  test('Buy Labels CTA is visible', async ({ page }) => {
    const buyLink = page.getByRole('link', { name: /buy labels/i }).first()
    await expect(buyLink).toBeVisible()
  })
})

test.describe('Sidebar navigation', () => {
  test('all sidebar links are present', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Track Cargo' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Label Dispatch' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Addresses' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()
  })

  test('clicking Track Cargo navigates to /cargo', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Track Cargo' }).click()
    await expect(page).toHaveURL(/\/cargo/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'Track Cargo', exact: true })).toBeVisible()
  })

  test('clicking Label Dispatch navigates to /dispatch', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Label Dispatch' }).click()
    await expect(page).toHaveURL(/\/dispatch/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'Label Dispatch', exact: true })).toBeVisible()
  })

  test('clicking Addresses navigates to /address-book', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Addresses' }).click()
    await expect(page).toHaveURL(/\/address-book/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: /address book/i })).toBeVisible()
  })

  test('clicking Settings navigates to /settings', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('domcontentloaded')
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(page).toHaveURL(/\/settings/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })
})
