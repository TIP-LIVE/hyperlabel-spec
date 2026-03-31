import { test, expect } from '@playwright/test'

test.describe('Checkout completion', () => {
  test('success page without session_id redirects to dashboard', async ({ page }) => {
    await page.goto('/checkout/success')
    const url = page.url()
    // Should redirect away from /checkout/success (to /dashboard, /org-selection, or /sign-in)
    const redirected = !url.includes('/checkout/success')
    expect(redirected).toBeTruthy()
  })

  test('success page with fake session_id shows confirmation', async ({ page }) => {
    await page.goto('/checkout/success?session_id=cs_test_fake123')
    const isSuccess = page.url().includes('/checkout/success')
    if (isSuccess) {
      // CardTitle renders as a div, not a heading
      await expect(page.getByText('Order Confirmed!')).toBeVisible()
      await expect(
        page.getByText('Thank you for your purchase. Your tracking labels are ready in your dashboard.')
      ).toBeVisible()
      await expect(page.getByText('Available in your dashboard now')).toBeVisible()

      // Session error warning (fake session won't load from Stripe)
      await expect(
        page.getByText(/payment was successful/)
      ).toBeVisible()

      // What's next steps
      await expect(page.getByText("What's next?")).toBeVisible()
      await expect(page.getByText('Your labels are now in your dashboard')).toBeVisible()
      await expect(page.getByText('Create a shipment and assign a label to it')).toBeVisible()
      await expect(page.getByText(/Share the tracking link.*track in real-time/)).toBeVisible()

      // Action buttons
      const goToDashboard = page.getByRole('link', { name: 'Go to Dashboard' })
      await expect(goToDashboard).toBeVisible()
      await expect(goToDashboard).toHaveAttribute('href', '/dashboard')

      const viewOrders = page.getByRole('link', { name: 'View Orders' })
      await expect(viewOrders).toBeVisible()
      await expect(viewOrders).toHaveAttribute('href', '/orders')
    }
  })

  test('cancel page shows correct wording and CTAs', async ({ page }) => {
    await page.goto('/checkout/cancel')
    const isCancel = page.url().includes('/checkout/cancel')
    if (isCancel) {
      // CardTitle renders as a div, not a heading
      await expect(page.getByText('Checkout Cancelled')).toBeVisible()
      await expect(
        page.getByText('Your order was not completed. No charges have been made.')
      ).toBeVisible()
      await expect(
        page.getByText(/If you encountered any issues during checkout/)
      ).toBeVisible()

      // CTAs
      const tryAgain = page.getByRole('link', { name: 'Try Again' })
      await expect(tryAgain).toBeVisible()
      await expect(tryAgain).toHaveAttribute('href', '/buy')

      const backToDashboard = page.getByRole('link', { name: 'Back to Dashboard' })
      await expect(backToDashboard).toBeVisible()
      await expect(backToDashboard).toHaveAttribute('href', '/dashboard')

      // Support email
      const supportLink = page.getByRole('link', { name: 'Contact support' })
      await expect(supportLink).toBeVisible()
      await expect(supportLink).toHaveAttribute('href', 'mailto:support@tip.live')
    }
  })
})
