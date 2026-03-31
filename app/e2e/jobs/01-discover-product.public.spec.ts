import { test, expect } from '@playwright/test'

test.describe('Discover the TIP product', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Header navigation', () => {
    test('shows desktop nav links and auth CTAs', async ({ page }) => {
      // Desktop nav links
      await expect(page.getByRole('link', { name: 'How It Works' }).first()).toBeVisible()
      await expect(page.getByRole('link', { name: 'FAQ' }).first()).toBeVisible()

      // Auth CTAs
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible()
    })
  })

  test.describe('Hero section', () => {
    test('shows headline and subheading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /door to door/i }).first()
      ).toBeVisible()

      await expect(
        page.getByRole('heading', { name: /live tracking label/i }).first()
      ).toBeVisible()
    })

    test('shows Buy Labels and Get Started CTAs', async ({ page }) => {
      const getStarted = page.getByRole('link', { name: /get started/i }).first()
      await expect(getStarted).toBeVisible()
      await expect(getStarted).toHaveAttribute('href', '/buy')
    })

    test('shows tip.live branding', async ({ page }) => {
      await expect(page.getByText('tip.live').first()).toBeVisible()
    })
  })

  test.describe('Industries section', () => {
    test('shows industry use cases', async ({ page }) => {
      await expect(page.getByText('Electronics').first()).toBeVisible()
      await expect(page.getByText('Pharma & Healthcare').first()).toBeVisible()
      await expect(page.getByText('Art & Collectibles').first()).toBeVisible()
      await expect(page.getByText('Air Cargo & Freight').first()).toBeVisible()
    })
  })

  test.describe('Pricing section', () => {
    test('shows 3 pricing packs', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /buy tip labels/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /buy 1 label/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /buy 5 labels/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /buy 10 labels/i })).toBeVisible()
    })

    test('pricing CTAs link to buy page', async ({ page }) => {
      const buyOne = page.getByRole('link', { name: /buy 1 label/i })
      await expect(buyOne).toHaveAttribute('href', /\/buy/)
    })
  })

  test.describe('Contact section', () => {
    test('shows contact email', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Get in Touch' })).toBeVisible()

      const emailLink = page.getByRole('link', { name: /support@tip\.live/ })
      await expect(emailLink).toBeVisible()
      await expect(emailLink).toHaveAttribute('href', 'mailto:support@tip.live')
    })
  })

  test.describe('Footer', () => {
    test('shows footer links and copyright', async ({ page }) => {
      const footer = page.locator('footer')

      await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Terms' })).toBeVisible()

      await expect(footer.getByText(/tip\.live/i)).toBeVisible()
    })
  })
})
