import { test, expect } from '@playwright/test'

test.describe('Discover the TIP product', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Header navigation', () => {
    test('shows desktop nav links and auth CTAs', async ({ page }) => {
      // Desktop nav links
      await expect(page.getByRole('link', { name: 'How it works' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Features' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Pricing' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'FAQ' })).toBeVisible()

      // Auth CTAs
      await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /get started/i })).toBeVisible()
    })
  })

  test.describe('Hero section', () => {
    test('shows headline and subheading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: /Live Door-to-Door.*Tracking Label.*For Any Cargo/i })
      ).toBeVisible()

      await expect(
        page.getByText('Stick a tracking label on your shipment and follow it from pickup to delivery.')
      ).toBeVisible()

      await expect(page.getByText(/in 180\+ countries/)).toBeVisible()
    })

    test('shows Buy Labels and Learn More CTAs', async ({ page }) => {
      const buyLabels = page.getByRole('link', { name: 'Buy Labels' }).first()
      await expect(buyLabels).toBeVisible()
      await expect(buyLabels).toHaveAttribute('href', '/sign-up')

      const learnMore = page.getByRole('link', { name: /learn more/i })
      await expect(learnMore).toBeVisible()
      await expect(learnMore).toHaveAttribute('href', '#how-it-works')
    })

    test('shows tracking card preview', async ({ page }) => {
      await expect(page.getByText('Cargo Robbie 16')).toBeVisible()
      await expect(page.getByText('Distance Left')).toBeVisible()
      await expect(page.getByText('Estimated Arrival')).toBeVisible()
    })

    test('shows tip.live branding', async ({ page }) => {
      await expect(page.getByText('tip.live').first()).toBeVisible()
    })
  })

  test.describe('How It Works section', () => {
    test('shows 4 steps with correct headings and descriptions', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'How It Works' })).toBeVisible()
      await expect(page.getByText('Four simple steps from order to delivery.')).toBeVisible()

      // 4 steps
      await expect(page.getByRole('heading', { name: '1. Order Labels' })).toBeVisible()
      await expect(
        page.getByText('Choose how many labels you need and we ship them to your door within 3-5 business days.')
      ).toBeVisible()

      await expect(page.getByRole('heading', { name: /2\. Activate & Attach/ })).toBeVisible()
      await expect(
        page.getByText(/Scan the QR code to activate, attach the label to your cargo/)
      ).toBeVisible()

      await expect(page.getByRole('heading', { name: '3. Track Anywhere' })).toBeVisible()
      await expect(
        page.getByText(/Follow your shipment on a live map/)
      ).toBeVisible()

      await expect(page.getByRole('heading', { name: '4. Delivery Alert' })).toBeVisible()
      await expect(
        page.getByText(/Get notified when your cargo arrives/)
      ).toBeVisible()
    })
  })

  test.describe('Features section', () => {
    test('shows 6 feature cards', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Why TIP?' })).toBeVisible()
      await expect(page.getByText('Four reasons shippers choose TIP.')).toBeVisible()

      await expect(page.getByRole('heading', { name: 'Reliable Global Coverage' })).toBeVisible()
      await expect(page.getByRole('heading', { name: '60+ Day Battery' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'AI Route Intelligence' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'One Price, No Surprises' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Shareable Links' })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Modern & Simple/ })).toBeVisible()
    })
  })

  test.describe('Use Cases section', () => {
    test('shows 4 use case cards', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Who Uses TIP?' })).toBeVisible()

      await expect(page.getByRole('heading', { name: /Electronics & Components/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Pharma & Healthcare/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Art & Collectibles/ })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Air Cargo & Freight/ })).toBeVisible()
    })
  })

  test.describe('Contact section', () => {
    test('shows contact email', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Get in Touch' })).toBeVisible()
      await expect(page.getByText(/Questions about tracking, orders, or enterprise/)).toBeVisible()

      const emailLink = page.getByRole('link', { name: /support@tip\.live/ })
      await expect(emailLink).toBeVisible()
      await expect(emailLink).toHaveAttribute('href', 'mailto:support@tip.live')
    })
  })

  test.describe('Final CTA section', () => {
    test('shows final call to action', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Ready to Track Door to Door?' })
      ).toBeVisible()
      await expect(
        page.getByText('Get your first tracking label and follow your cargo from pickup to delivery.')
      ).toBeVisible()

      const ctaButton = page.getByRole('link', { name: 'Get Your First Label' })
      await expect(ctaButton).toBeVisible()
      await expect(ctaButton).toHaveAttribute('href', '/sign-up')
    })
  })

  test.describe('Footer', () => {
    test('shows footer links and copyright', async ({ page }) => {
      const footer = page.locator('footer')

      await expect(footer.getByRole('link', { name: 'Features' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Pricing' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'FAQ' })).toBeVisible()
      await expect(footer.getByRole('link', { name: 'Contact' })).toBeVisible()

      const privacyLink = footer.getByRole('link', { name: 'Privacy' })
      await expect(privacyLink).toBeVisible()
      await expect(privacyLink).toHaveAttribute('href', '/privacy')

      const termsLink = footer.getByRole('link', { name: 'Terms' })
      await expect(termsLink).toBeVisible()
      await expect(termsLink).toHaveAttribute('href', '/terms')

      await expect(footer.getByText(/TIP\. All rights reserved\./)).toBeVisible()
    })
  })
})
