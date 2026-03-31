import { test, expect } from '@playwright/test'

test.describe('Check label status via activation URL', () => {
  test('invalid device ID format shows Invalid Label error', async ({ page }) => {
    await page.goto('/activate/INVALID-ID')

    // CardTitle is a div, not a heading — use getByText
    await expect(page.getByText('Invalid Label')).toBeVisible()
    await expect(page.getByText(/is not a valid TIP tracking label ID/)).toBeVisible()
    await expect(page.getByText('TIP-001')).toBeVisible()
    await expect(page.getByText('HL-001234')).toBeVisible()

    const goToTip = page.getByRole('link', { name: 'Go to TIP' })
    await expect(goToTip).toBeVisible()
    await expect(goToTip).toHaveAttribute('href', '/')
  })

  test('unknown valid device ID shows Label Not Found', async ({ page }) => {
    await page.goto('/activate/TIP-999')

    // CardTitle is a div, not a heading — use getByText
    await expect(page.getByText('Label Not Found')).toBeVisible()
    await expect(page.getByText('TIP-999')).toBeVisible()
    await expect(page.getByText(/It may not have been registered yet/)).toBeVisible()
    await expect(page.getByText(/contact us for help/)).toBeVisible()

    const goToTip = page.getByRole('link', { name: 'Go to TIP' })
    await expect(goToTip).toBeVisible()
    await expect(goToTip).toHaveAttribute('href', '/')
  })

  test('activation page does not return server error', async ({ page }) => {
    const response = await page.goto('/activate/TIP-001')
    expect(response?.status()).not.toBe(500)
  })

  test('powered-by footer shows on all activation states', async ({ page }) => {
    await page.goto('/activate/TIP-999')

    await expect(page.getByText(/Powered by/)).toBeVisible()
    const tipLink = page.getByRole('link', { name: 'TIP' }).last()
    await expect(tipLink).toBeVisible()
    await expect(tipLink).toHaveAttribute('href', '/')
    await expect(page.getByText(/door-to-door cargo tracking/)).toBeVisible()
  })
})
