import { test as setup } from '@playwright/test'

setup('authenticate as user', async ({ page }) => {
  // Skip auth setup if CLERK_TEST_EMAIL/PASSWORD not set
  const email = process.env.CLERK_TEST_EMAIL
  const password = process.env.CLERK_TEST_PASSWORD

  if (!email || !password) {
    // Create empty auth state for tests to handle individually
    await page.goto('/')
    await page.context().storageState({ path: 'e2e/.auth/user.json' })
    return
  }

  // Sign in via Clerk
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /continue/i }).click()
  await page.waitForURL(/dashboard|org-selection/)
  await page.context().storageState({ path: 'e2e/.auth/user.json' })
})
