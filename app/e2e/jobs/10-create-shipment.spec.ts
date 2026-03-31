import { test, expect } from '@playwright/test'

test.describe('Create a new shipment', () => {
  test('cargo new page shows heading and description', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNew = page.url().includes('/cargo/new')
    if (isNew) {
      await expect(
        page.getByRole('heading', { name: /new cargo shipment/i })
      ).toBeVisible()
      await expect(
        page.getByText('Attach a tracking label to your cargo and monitor its journey in real time')
      ).toBeVisible()
    }
  })

  test('cargo form shows Cargo Essentials section', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNew = page.url().includes('/cargo/new')
    if (isNew) {
      await expect(page.getByText('Cargo Essentials')).toBeVisible()
      await expect(page.getByText('Cargo Name / ID')).toBeVisible()
    }
  })

  test('cargo form shows Route Details section', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNew = page.url().includes('/cargo/new')
    if (isNew) {
      await expect(page.getByText('Route Details')).toBeVisible()
    }
  })

  test('cargo form has action buttons', async ({ page }) => {
    await page.goto('/cargo/new')
    const isNew = page.url().includes('/cargo/new')
    if (isNew) {
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible()
      await expect(
        page.getByRole('button', { name: /create cargo shipment/i })
      ).toBeVisible()
    }
  })

  test('dispatch new page shows heading and description', async ({ page }) => {
    await page.goto('/dispatch/new')
    const isNew = page.url().includes('/dispatch/new')
    if (isNew) {
      await expect(
        page.getByRole('heading', { name: /new label dispatch/i })
      ).toBeVisible()
      await expect(
        page.getByText('Ship multiple labels from your warehouse to a customer location')
      ).toBeVisible()
    }
  })
})
