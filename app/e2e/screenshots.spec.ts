/**
 * Screenshot capture test — runs in the chromium project (authenticated)
 * Takes screenshots of key pages for visual proof.
 */
import { test } from '@playwright/test'
import * as fs from 'fs'

test.setTimeout(60_000)

const pages = [
  { name: '01-dashboard', url: '/dashboard' },
  { name: '02-cargo', url: '/cargo' },
  { name: '03-labels', url: '/labels' },
  { name: '04-orders', url: '/orders' },
  { name: '05-buy', url: '/buy' },
  { name: '06-settings', url: '/settings' },
  { name: '07-admin', url: '/admin' },
  { name: '08-admin-labels', url: '/admin/labels' },
  { name: '09-admin-orders', url: '/admin/orders' },
]

test('capture screenshots of all key pages', async ({ page }) => {
  fs.mkdirSync('screenshots', { recursive: true })
  for (const p of pages) {
    await page.goto(p.url)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await page.screenshot({ path: `screenshots/${p.name}.png`, fullPage: false })
    console.log(`Screenshot saved: screenshots/${p.name}.png`)
  }
})
