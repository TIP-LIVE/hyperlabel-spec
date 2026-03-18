import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
const baseURL = process.env.PLAYWRIGHT_BASE_URL || (isCI ? 'http://127.0.0.1:3000' : 'http://localhost:3000')

const ciLaunchOptions = isCI
  ? {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--proxy-server=direct://',
        '--proxy-bypass-list=*',
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
    baseURL,
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
        launchOptions: ciLaunchOptions,
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: isCI ? 'http://127.0.0.1:3000' : 'http://localhost:3000',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
