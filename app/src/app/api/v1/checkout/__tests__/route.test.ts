import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { mockAuthenticatedUser, mockUnauthenticated } from '@/test/helpers/auth-mock'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true, limit: 10, remaining: 9, resetAt: Date.now() + 60000 }),
  RATE_LIMIT_CHECKOUT: { limit: 10, windowMs: 60000 },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
  },
  isStripeConfigured: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/pricing', () => ({
  getLabelPack: vi.fn(async (key: string) => {
    const packs: Record<string, { key: string; name: string; description: string; quantity: number; priceCents: number; popular: boolean }> = {
      starter: { key: 'starter', name: '1 Label', description: 'Try it out', quantity: 1, priceCents: 2500, popular: false },
      team: { key: 'team', name: '5 Labels', description: 'Most popular', quantity: 5, priceCents: 11000, popular: true },
      volume: { key: 'volume', name: '10 Labels', description: 'Best price per label', quantity: 10, priceCents: 20000, popular: false },
    }
    return packs[key] ?? null
  }),
}))

vi.mock('@/lib/admin-whitelist', () => ({
  isAdminEmail: vi.fn().mockReturnValue(false),
}))

import { POST } from '../route'
import { db } from '@/lib/db'
import { stripe, isStripeConfigured } from '@/lib/stripe'

const mockedDb = vi.mocked(db)
const mockedStripe = vi.mocked(stripe)
const mockedIsStripeConfigured = vi.mocked(isStripeConfigured)

beforeEach(() => {
  vi.clearAllMocks()
  // Default: stripe configured, user exists in DB
  mockedIsStripeConfigured.mockReturnValue(true)
})

describe('POST /api/v1/checkout', () => {
  const mockDbUser = {
    id: 'db-user-001',
    clerkId: 'clerk_test_user_001',
    email: 'test@tip.live',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    notifyLabelActivated: true,
    notifyLowBattery: true,
    notifyNoSignal: true,
    notifyDelivered: true,
    notifyOrderShipped: true,
  }

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/checkout', {
      method: 'POST',
      body: { packType: 'starter' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(500)
    // requireOrgAuth throws "Unauthorized" which is caught in the generic catch
    expect((body as { error: string }).error).toContain('Unauthorized')
  })

  it('returns 400 for invalid pack type', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)

    const req = createTestRequest('/api/v1/checkout', {
      method: 'POST',
      body: { packType: 'mega-ultra' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Validation failed')
  })

  it('returns 503 when Stripe not configured', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)
    mockedIsStripeConfigured.mockReturnValue(false)

    const req = createTestRequest('/api/v1/checkout', {
      method: 'POST',
      body: { packType: 'starter' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(503)
    expect((body as { error: string }).error).toContain('Payment system is not available')
  })

  it('creates Stripe session with correct metadata on success', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)

    mockedStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_session_001',
      url: 'https://checkout.stripe.com/session/cs_test_session_001',
    } as never)

    const req = createTestRequest('/api/v1/checkout', {
      method: 'POST',
      body: { packType: 'starter' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { sessionId: string; url: string }
    expect(typedBody.sessionId).toBe('cs_test_session_001')
    expect(typedBody.url).toBe('https://checkout.stripe.com/session/cs_test_session_001')

    expect(mockedStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'payment',
        metadata: expect.objectContaining({
          userId: 'db-user-001',
          orgId: 'org_test_001',
          packType: 'starter',
          quantity: '1',
        }),
      })
    )
  })
})
