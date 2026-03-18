import dns from 'node:dns'
import { defineConfig, devices } from '@playwright/test'

// Node 20+ prefers IPv6 by default; force IPv4 so localhost resolves to 127.0.0.1
dns.setDefaultResultOrder('ipv4first')

const isCI = !!process.env.CI

const ciLaunchOptions = isCI
  ? {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    }
  : {}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? 'github' : 'html',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: /.*\.public\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use full Chromium (not headless-shell) in CI to avoid ERR_NAME_NOT_RESOLVED
        channel: isCI ? 'chromium' : undefined,
        storageState: 'e2e/.auth/user.json',
        launchOptions: ciLaunchOptions,
      },
      dependencies: ['setup'],
    },
    {
      name: 'public',
      testMatch: /.*\.public\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        channel: isCI ? 'chromium' : undefined,
        launchOptions: ciLaunchOptions,
      },
    },
  ],
  webServer: {
    command: isCI ? 'npx next dev --hostname 0.0.0.0' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
