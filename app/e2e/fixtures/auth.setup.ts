import { test as setup } from '@playwright/test'
import { clerkSetup, clerk } from '@clerk/testing/playwright'
import * as fs from 'fs'
import type { } from '@playwright/test'

setup.setTimeout(60_000)

setup('authenticate as user', async ({ page }) => {
  fs.mkdirSync('e2e/.auth', { recursive: true })

  const email = process.env.CLERK_TEST_EMAIL

  if (!email) {
    await page.goto('/')
    await page.context().storageState({ path: 'e2e/.auth/user.json' })
    return
  }

  // Set up Clerk testing infrastructure (derives FAPI URL + testing token)
  await clerkSetup()

  // Navigate to app first so Clerk JS loads
  await page.goto('http://localhost:3000/sign-in')
  await page.waitForLoadState('domcontentloaded')
  // Wait for Clerk to initialize
  await page.waitForFunction(() => typeof (window as any).Clerk !== 'undefined', { timeout: 15_000 })
  await page.waitForFunction(() => (window as any).Clerk?.loaded, { timeout: 10_000 })

  // Sign in programmatically via Clerk backend API (no UI interaction, no OTP)
  await clerk.signIn({ page, emailAddress: email })

  // Navigate to dashboard to ensure org context is set
  await page.goto('http://localhost:3000/dashboard')
  await page.waitForURL(/dashboard|org-selection/, { timeout: 15_000 })

  // If on org-selection, select the existing org
  if (page.url().includes('org-selection')) {
    await page.waitForTimeout(1000)
    const orgButton = page.locator('button:has-text("TIP Test Org"), [data-localization-key] button').first()
    if (await orgButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await orgButton.click()
      await page.waitForURL(/dashboard/, { timeout: 10_000 })
    }
  }

  await page.context().storageState({ path: 'e2e/.auth/user.json' })
  console.log('Auth complete. Final URL:', page.url())
})
