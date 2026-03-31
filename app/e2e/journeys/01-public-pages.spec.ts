/**
 * Phase 1 + 14: Public pages & error states
 * Tests the marketing site, legal pages, and error states as an unauthenticated visitor.
 */
import { test, expect } from '@playwright/test'

// Public tests run without auth — override storageState
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Landing page', () => {
  test('hero section renders key content', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    await expect(page.getByText('Live Tracking Label')).toBeVisible()
    await expect(page.getByText(/No Blind/)).toBeVisible()
    await expect(page.getByText('Applicable to any cargo')).toBeVisible()
  })

  test('Get Started CTA redirects to sign-in', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const cta = page.getByRole('link', { name: /get started/i }).first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/sign-in|sign-up/, { timeout: 10_000 })
  })

  test('How it Works nav link works', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')

    const link = page.getByRole('link', { name: /how it works/i }).first()
    if (await link.isVisible().catch(() => false)) {
      await link.click()
      await expect(page).toHaveURL(/how-it-works/, { timeout: 8_000 })
    }
  })
})

test.describe('Legal pages', () => {
  test('terms page renders', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
  })

  test('privacy page renders', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
  })
})

test.describe('Error states', () => {
  test('404 page renders for unknown routes', async ({ browser }) => {
    // Use unauthenticated context — middleware may redirect auth'd users
    const ctx = await browser.newContext()
    const p = await ctx.newPage()
    await p.goto('http://localhost:3000/this-page-definitely-does-not-exist-xyz123')
    await p.waitForLoadState('domcontentloaded')
    // Next.js 404 page or redirect to sign-in (both are valid — route doesn't exist)
    const has404OrRedirect =
      (await p.getByText('404').isVisible().catch(() => false)) ||
      (await p.getByText(/not found/i).isVisible().catch(() => false)) ||
      (await p.getByText(/page.*not.*found/i).isVisible().catch(() => false)) ||
      p.url().includes('/sign-in')
    expect(has404OrRedirect).toBeTruthy()
    await ctx.close()
  })

  test('invalid tracking code shows error or not-found state', async ({ page }) => {
    await page.goto('/track/INVALID_CODE_THAT_DOES_NOT_EXIST_XYZ999')
    await page.waitForLoadState('domcontentloaded')
    const hasError =
      (await page.getByText(/not found/i).isVisible().catch(() => false)) ||
      (await page.getByText(/invalid/i).isVisible().catch(() => false)) ||
      (await page.getByText(/404/i).isVisible().catch(() => false)) ||
      (await page.getByText(/shipment.*not.*found/i).isVisible().catch(() => false)) ||
      (await page.getByText(/no.*shipment/i).isVisible().catch(() => false))
    expect(hasError).toBeTruthy()
  })

  test('unauthenticated access to dashboard redirects to sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/sign-in/, { timeout: 10_000 })
    await expect(page).toHaveURL(/sign-in/)
  })

  test('unauthenticated access to admin redirects to sign-in', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/sign-in|dashboard/, { timeout: 10_000 })
    const url = page.url()
    expect(url.includes('sign-in') || url.includes('dashboard')).toBeTruthy()
  })
})

test.describe('Checkout result pages', () => {
  test('checkout success without session_id redirects away', async ({ page }) => {
    await page.goto('/checkout/success')
    await page.waitForLoadState('domcontentloaded')
    const url = page.url()
    // Should redirect to dashboard or sign-in, not stay on /checkout/success
    const redirected = !url.includes('/checkout/success')
    expect(redirected).toBeTruthy()
  })

  test('checkout cancel page renders', async ({ page }) => {
    await page.goto('/checkout/cancel')
    await page.waitForLoadState('domcontentloaded')
    const isCancel = page.url().includes('/checkout/cancel')
    if (isCancel) {
      await expect(page.getByText('Checkout Cancelled')).toBeVisible()
      await expect(page.getByText('Your order was not completed')).toBeVisible()
      const tryAgain = page.getByRole('link', { name: 'Try Again' })
      await expect(tryAgain).toBeVisible()
      await expect(tryAgain).toHaveAttribute('href', '/buy')
    }
  })
})
