import { vi } from 'vitest'

// Set test environment variables
// @ts-expect-error -- NODE_ENV is readonly in newer TS but we need to set it for tests
process.env.NODE_ENV = 'test'
process.env.DEVICE_API_KEY = 'test-device-api-key'
process.env.CRON_SECRET = 'test-cron-secret'
process.env.STRIPE_SECRET_KEY = 'sk_test_fake'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake'
process.env.CLERK_WEBHOOK_SECRET = 'test-clerk-webhook-secret'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_dummy'
process.env.CLERK_SECRET_KEY = 'sk_test_dummy'

// Mock Clerk server module globally
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ userId: null, orgId: null, orgRole: null }),
  currentUser: vi.fn().mockResolvedValue(null),
  clerkMiddleware: vi.fn(() => vi.fn()),
  createRouteMatcher: vi.fn(() => vi.fn()),
}))

// Mock database to prevent PrismaClient initialization without DATABASE_URL
vi.mock('@/lib/db', () => {
  const mockDb = {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    label: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    shipment: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    shipmentLabel: { findMany: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn() },
    locationEvent: { create: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    order: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn(), deleteMany: vi.fn() },
    orderLabel: { createMany: vi.fn(), deleteMany: vi.fn() },
    savedAddress: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), deleteMany: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    orgSettings: { findUnique: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
  }
  return { db: mockDb }
})

// Mock clerk-config to always return true in tests
vi.mock('@/lib/clerk-config', () => ({
  isClerkConfigured: vi.fn().mockReturnValue(true),
}))

// Mock notifications to prevent email sending
vi.mock('@/lib/notifications', () => ({
  sendLabelActivatedNotification: vi.fn().mockResolvedValue(undefined),
  sendConsigneeTrackingNotification: vi.fn().mockResolvedValue(undefined),
  sendConsigneeInTransitNotification: vi.fn().mockResolvedValue(undefined),
  sendConsigneeDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendShipmentDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchInTransitNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchConsigneeInTransitNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchConsigneeDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmedNotification: vi.fn().mockResolvedValue(undefined),
  sendLowInventoryAlert: vi.fn().mockResolvedValue(undefined),
  sendLowBatteryNotification: vi.fn().mockResolvedValue(undefined),
}))

// Mock geocoding to prevent external API calls
vi.mock('@/lib/geocoding', () => ({
  reverseGeocode: vi.fn().mockResolvedValue({
    city: 'Test City',
    country: 'Test Country',
    countryCode: 'TC',
  }),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))
