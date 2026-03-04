import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRawRequest, parseResponse } from '@/test/helpers/api'
import { stripeCheckoutSession } from '@/test/helpers/fixtures'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    order: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    label: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    orderLabel: {
      createMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { POST } from '../stripe/route'
import { db } from '@/lib/db'
import { stripe } from '@/lib/stripe'
import { headers } from 'next/headers'

const mockedDb = vi.mocked(db)
const mockedStripe = vi.mocked(stripe)
const mockedHeaders = vi.mocked(headers)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/webhooks/stripe', () => {
  const webhookBody = JSON.stringify({ type: 'checkout.session.completed' })

  function mockHeadersWithSignature(signature: string | null) {
    mockedHeaders.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === 'stripe-signature') return signature
        return null
      }),
    } as never)
  }

  it('returns 400 when stripe-signature header missing', async () => {
    mockHeadersWithSignature(null)

    const req = createRawRequest('/api/webhooks/stripe', {
      method: 'POST',
      body: webhookBody,
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Missing signature')
  })

  it('returns 400 when signature verification fails', async () => {
    mockHeadersWithSignature('sig_test_invalid')
    mockedStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Signature verification failed')
    })

    const req = createRawRequest('/api/webhooks/stripe', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'sig_test_invalid',
      },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Invalid signature')
  })

  it('handles checkout.session.completed: creates order', async () => {
    const session = stripeCheckoutSession()

    mockHeadersWithSignature('sig_test_valid')
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    } as never)

    // No existing order (not a duplicate)
    mockedDb.order.findUnique.mockResolvedValue(null as never)
    // Create order
    mockedDb.order.create.mockResolvedValue({
      id: 'order-001',
      userId: session.metadata.userId,
      orgId: session.metadata.orgId,
      stripeSessionId: session.id,
      stripePaymentId: session.payment_intent,
      status: 'PAID',
      totalAmount: session.amount_total,
      currency: 'GBP',
      quantity: 1,
    } as never)
    // Available labels
    mockedDb.label.findMany.mockResolvedValue([
      { id: 'label-001', deviceId: 'TIP-001', status: 'INVENTORY' },
    ] as never)
    // Assign labels
    mockedDb.orderLabel.createMany.mockResolvedValue({ count: 1 } as never)
    mockedDb.label.updateMany.mockResolvedValue({ count: 1 } as never)

    const req = createRawRequest('/api/webhooks/stripe', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'sig_test_valid',
      },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect((body as { received: boolean }).received).toBe(true)

    // Verify order was created with correct data
    expect(mockedDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-test-001',
          orgId: 'org_test_001',
          stripeSessionId: 'cs_test_session_001',
          stripePaymentId: 'pi_test_001',
          status: 'PAID',
          totalAmount: 12500,
          currency: 'GBP',
          quantity: 1,
        }),
      })
    )

    // Verify labels were assigned
    expect(mockedDb.orderLabel.createMany).toHaveBeenCalled()
    expect(mockedDb.label.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['label-001'] } },
        data: { status: 'SOLD' },
      })
    )
  })

  it('is idempotent (existing order with same stripeSessionId)', async () => {
    const session = stripeCheckoutSession()

    mockHeadersWithSignature('sig_test_valid')
    mockedStripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: session },
    } as never)

    // Order already exists
    mockedDb.order.findUnique.mockResolvedValue({
      id: 'order-existing',
      stripeSessionId: session.id,
    } as never)

    const req = createRawRequest('/api/webhooks/stripe', {
      method: 'POST',
      body: webhookBody,
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'sig_test_valid',
      },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect((body as { received: boolean }).received).toBe(true)

    // Should NOT create a new order
    expect(mockedDb.order.create).not.toHaveBeenCalled()
  })
})
