import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { mockAuthenticatedUser, mockUnauthenticated } from '@/test/helpers/auth-mock'

vi.mock('@/lib/db', () => {
  const mockDb = {
    user: { findUnique: vi.fn() },
    label: { findMany: vi.fn() },
    shipment: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    shipmentLabel: { findMany: vi.fn(), createMany: vi.fn() },
    locationEvent: { update: vi.fn() },
    $transaction: vi.fn(),
  }
  return { db: mockDb }
})

vi.mock('@/lib/utils/share-code', () => ({
  generateShareCode: vi.fn().mockReturnValue('FIXEDCODE'),
}))

vi.mock('@/lib/geocoding', () => ({
  reverseGeocode: vi.fn().mockResolvedValue(null),
}))

import { POST } from '../route'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

const fakeDbUser = {
  id: 'db-user-001',
  clerkId: 'clerk_test_user_001',
  email: 'test@tip.live',
  firstName: 'Test',
  lastName: 'User',
  imageUrl: null,
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const fakeLabels = [
  { id: 'label-1', deviceId: 'TIP-001', status: 'SOLD', orderLabels: [] },
  { id: 'label-2', deviceId: 'TIP-002', status: 'SOLD', orderLabels: [] },
]

/**
 * Wire up the $transaction mock to invoke the callback with a tx object that
 * captures shipment.create + shipmentLabel.createMany. Returns the captured
 * payload so tests can assert against it.
 */
function wireTransaction() {
  const captured: { createData: Record<string, unknown> | null } = { createData: null }

  mockDb.$transaction.mockImplementation(async (cb: unknown) => {
    const fn = cb as (tx: unknown) => Promise<unknown>
    const tx = {
      shipment: {
        create: vi.fn(async (args: { data: Record<string, unknown> }) => {
          captured.createData = args.data
          return { id: 'shipment-001', ...args.data }
        }),
        findUniqueOrThrow: vi.fn(async () => ({
          id: 'shipment-001',
          ...captured.createData,
          shipmentLabels: fakeLabels.map((l) => ({
            label: { id: l.id, deviceId: l.deviceId, batteryPct: null, status: l.status },
          })),
        })),
      },
      shipmentLabel: { createMany: vi.fn().mockResolvedValue({ count: fakeLabels.length }) },
    }
    return fn(tx)
  })

  return captured
}

const baseBody = {
  name: 'Spring Drop',
  labelIds: ['label-1', 'label-2'],
}

const completeBody = {
  ...baseBody,
  receiverFirstName: 'Jane',
  receiverLastName: 'Doe',
  receiverEmail: 'jane@example.com',
  destinationLine1: '123 Main St',
  destinationCity: 'Berlin',
  destinationPostalCode: '10115',
  destinationCountry: 'DE',
  askReceiver: false,
}

describe('POST /api/v1/dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: share code is unique on first try
    mockDb.shipment.findUnique.mockResolvedValue(null as never)
    // Default: labels look up cleanly
    mockDb.label.findMany.mockResolvedValue(fakeLabels as never)
    // Default: no existing dispatches block these labels
    mockDb.shipmentLabel.findMany.mockResolvedValue([] as never)
  })

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/dispatch', { method: 'POST', body: baseBody })
    const res = await POST(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(401)
  })

  it('returns 400 when validation fails (missing labelIds)', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const req = createTestRequest('/api/v1/dispatch', {
      method: 'POST',
      body: { name: 'No labels' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toMatch(/Validation/i)
  })

  it('blank-destination dispatch sets shareLinkExpiresAt ~14 days out and addressSubmittedAt = null', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    const captured = wireTransaction()

    const before = Date.now()
    const req = createTestRequest('/api/v1/dispatch', {
      method: 'POST',
      body: { ...baseBody, askReceiver: true },
    })
    const res = await POST(req)
    const after = Date.now()

    const { status, body } = await parseResponse<{
      shareLink: string | null
      awaitingReceiverDetails: boolean
    }>(res)

    expect(status).toBe(201)
    expect(body.awaitingReceiverDetails).toBe(true)
    expect(body.shareLink).toBe('/track/FIXEDCODE')

    const data = captured.createData as Record<string, unknown> | null
    expect(data).not.toBeNull()
    expect(data!.addressSubmittedAt).toBeNull()
    expect(data!.shareLinkExpiresAt).toBeInstanceOf(Date)

    const expiry = (data!.shareLinkExpiresAt as Date).getTime()
    const fourteenDays = 14 * 24 * 60 * 60 * 1000
    expect(expiry).toBeGreaterThanOrEqual(before + fourteenDays - 1000)
    expect(expiry).toBeLessThanOrEqual(after + fourteenDays + 1000)

    expect(data!.shareCode).toBe('FIXEDCODE')
    expect(data!.receiverFirstName).toBeNull()
    expect(data!.receiverLastName).toBeNull()
    expect(data!.consigneeEmail).toBeNull()
  })

  it('blank-destination is also triggered when receiver fields are simply missing (no askReceiver flag)', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    const captured = wireTransaction()

    const req = createTestRequest('/api/v1/dispatch', {
      method: 'POST',
      body: baseBody,
    })
    const res = await POST(req)
    const { status, body } = await parseResponse<{
      shareLink: string | null
      awaitingReceiverDetails: boolean
    }>(res)

    expect(status).toBe(201)
    expect(body.awaitingReceiverDetails).toBe(true)
    expect(body.shareLink).toBe('/track/FIXEDCODE')

    const data = captured.createData as Record<string, unknown>
    expect(data.addressSubmittedAt).toBeNull()
    expect(data.shareLinkExpiresAt).toBeInstanceOf(Date)
  })

  it('complete dispatch sets addressSubmittedAt = now and shareLinkExpiresAt = null', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    const captured = wireTransaction()

    const before = Date.now()
    const req = createTestRequest('/api/v1/dispatch', { method: 'POST', body: completeBody })
    const res = await POST(req)
    const after = Date.now()

    const { status, body } = await parseResponse<{
      shareLink: string | null
      awaitingReceiverDetails: boolean
    }>(res)

    expect(status).toBe(201)
    expect(body.awaitingReceiverDetails).toBe(false)
    expect(body.shareLink).toBeNull()

    const data = captured.createData as Record<string, unknown>
    expect(data.shareLinkExpiresAt).toBeNull()
    expect(data.addressSubmittedAt).toBeInstanceOf(Date)
    const submittedAt = (data.addressSubmittedAt as Date).getTime()
    expect(submittedAt).toBeGreaterThanOrEqual(before - 50)
    expect(submittedAt).toBeLessThanOrEqual(after + 50)

    // Receiver fields persisted onto the shipment row
    expect(data.receiverFirstName).toBe('Jane')
    expect(data.receiverLastName).toBe('Doe')
    expect(data.destinationName).toBe('Jane Doe')
    expect(data.destinationLine1).toBe('123 Main St')
    expect(data.destinationCity).toBe('Berlin')
    expect(data.destinationPostalCode).toBe('10115')
    expect(data.destinationCountry).toBe('DE')
    expect(data.consigneeEmail).toBe('jane@example.com')
  })

  it('returns 404 when one or more labels are not found', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.label.findMany.mockResolvedValueOnce([fakeLabels[0]] as never)

    const req = createTestRequest('/api/v1/dispatch', { method: 'POST', body: baseBody })
    const res = await POST(req)
    const { status, body } = await parseResponse<{ error: string; missing: string[] }>(res)

    expect(status).toBe(404)
    expect(body.error).toBe('Labels not found')
    expect(body.missing).toEqual(['label-2'])
  })

  it('returns 400 when labels are already in another active dispatch', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipmentLabel.findMany.mockResolvedValueOnce([
      { label: { deviceId: 'TIP-001' } },
    ] as never)

    const req = createTestRequest('/api/v1/dispatch', { method: 'POST', body: baseBody })
    const res = await POST(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toMatch(/already in an active dispatch/i)
  })
})
