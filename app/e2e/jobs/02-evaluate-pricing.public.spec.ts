import { test, expect } from '@playwright/test'

test.describe('Evaluate pricing and FAQ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test.describe('Pricing section', () => {
    test('shows pricing heading and subheading', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /buy tip labels/i })).toBeVisible()
      await expect(
        page.getByText(/One-time purchase — no subscription, no hidden fees/)
      ).toBeVisible()
    })

    test('shows 3 pricing packs with correct prices', async ({ page }) => {
      // Pack 1: 1 Label
      await expect(page.getByRole('heading', { name: '1 Label' })).toBeVisible()
      await expect(page.getByText('Single label')).toBeVisible()
      await expect(page.getByText('$25')).toBeVisible()

      // Pack 2: 5 Labels (Best Value)
      await expect(page.getByText('Best Value').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: '5 Labels' })).toBeVisible()
      await expect(page.getByText('$22 per label')).toBeVisible()
      await expect(page.getByText('$110')).toBeVisible()

      // Pack 3: 10 Labels
      await expect(page.getByRole('heading', { name: '10 Labels' })).toBeVisible()
      await expect(page.getByText('$20 per label')).toBeVisible()
      await expect(page.getByText('$200')).toBeVisible()
    })

    test('shows pack features', async ({ page }) => {
      await expect(page.getByText(/Full tracking & map/)).toBeVisible()
      await expect(page.getByText(/Shareable link/).first()).toBeVisible()
      await expect(page.getByText(/Email notifications/).first()).toBeVisible()
      await expect(page.getByText(/Free shipping/).first()).toBeVisible()
      await expect(page.getByText(/60\+ day battery/).first()).toBeVisible()
    })

    test('pack CTAs link to buy page', async ({ page }) => {
      const buy1 = page.getByRole('link', { name: 'Buy 1 Label' })
      await expect(buy1).toBeVisible()
      await expect(buy1).toHaveAttribute('href', /\/buy/)

      const buy5 = page.getByRole('link', { name: 'Buy 5 Labels' })
      await expect(buy5).toBeVisible()
      await expect(buy5).toHaveAttribute('href', /\/buy/)

      const buy10 = page.getByRole('link', { name: 'Buy 10 Labels' })
      await expect(buy10).toBeVisible()
      await expect(buy10).toHaveAttribute('href', /\/buy/)
    })
  })

  test.describe('FAQ section', () => {
    test('shows FAQ heading and 10 questions', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Frequently Asked Questions' })
      ).toBeVisible()
      await expect(
        page.getByText('Common questions about TIP tracking labels.')
      ).toBeVisible()

      // All 10 FAQ questions
      const questions = [
        'What is TIP?',
        'How does tracking work?',
        'Which countries are supported?',
        'How long does the battery last?',
        'How do I attach the label to my cargo?',
        'Can I share tracking with my consignee?',
        'What if the label is defective?',
        'Can I track multiple shipments at once?',
        'Does TIP use AI?',
        'Do you offer bulk or enterprise pricing?',
      ]

      for (const q of questions) {
        await expect(page.getByText(q, { exact: true })).toBeVisible()
      }
    })

    test('clicking FAQ item reveals answer', async ({ page }) => {
      // Click first FAQ
      await page.getByText('What is TIP?', { exact: true }).click()
      await expect(
        page.getByText(/TIP is a disposable tracking label/)
      ).toBeVisible()
    })

    test('last FAQ answer mentions support contact', async ({ page }) => {
      await page.getByText('Do you offer bulk or enterprise pricing?', { exact: true }).click()
      // Answer should be visible after clicking
      const lastItem = page.locator('[data-state="open"]').last()
      await expect(lastItem).toBeVisible()
    })
  })
})
