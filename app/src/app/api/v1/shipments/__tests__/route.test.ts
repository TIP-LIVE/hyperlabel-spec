import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
} from '@/test/helpers/auth-mock'
import {
  validCargoShipment,
  validDispatchShipment,
} from '@/test/helpers/fixtures'

// Mock database
vi.mock('@/lib/db', () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    shipment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
    },
    label: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    shipmentLabel: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn(),
    },
    locationEvent: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    // Interactive-transaction callback runs against the same mockDb so the
    // create/update mocks set up by tests apply inside tx blocks too.
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockDb)),
  }
  return { db: mockDb }
})

// Mock share code generation
vi.mock('@/lib/utils/share-code', () => ({
  generateShareCode: vi.fn().mockReturnValue('ABC12345'),
}))

// Mock notifications
vi.mock('@/lib/notifications', () => ({
  sendLabelActivatedNotification: vi.fn().mockResolvedValue(undefined),
  sendConsigneeTrackingNotification: vi.fn().mockResolvedValue(undefined),
}))


import { GET, POST } from '../route'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

// Fake user record as returned from DB
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

describe('GET /api/v1/shipments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/shipments')
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 403 when no org selected', async () => {
    // Simulate a user who is logged in but has no org selected
    mockAuthenticatedUser({ orgId: undefined as unknown as string })
    // auth() returns userId but no orgId — override to simulate this
    const { auth } = await import('@clerk/nextjs/server')
    vi.mocked(auth).mockResolvedValueOnce({
      userId: 'clerk_test_user_001',
      orgId: null,
      orgRole: null,
      orgSlug: null,
    } as never)

    const req = createTestRequest('/api/v1/shipments')
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect(body).toEqual({ error: 'Organization required' })
  })

  it('returns shipments list with pagination on success', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const fakeShipments = [
      {
        id: 'ship-001',
        name: 'Test Shipment',
        type: 'CARGO_TRACKING',
        status: 'PENDING',
        shareCode: 'ABC12345',
        label: { id: 'label-1', deviceId: 'TIP-001', batteryPct: 85, status: 'ACTIVE' },
        shipmentLabels: [],
        locations: [],
        createdAt: new Date(),
      },
    ]
    mockDb.shipment.findMany.mockResolvedValueOnce(fakeShipments as never)
    mockDb.shipment.count.mockResolvedValueOnce(1 as never)

    const req = createTestRequest('/api/v1/shipments?limit=10&offset=0')
    const res = await GET(req)
    const { status, body } = await parseResponse<{
      shipments: unknown[]
      pagination: { total: number; limit: number; offset: number; hasMore: boolean }
    }>(res)

    expect(status).toBe(200)
    expect(body.shipments).toHaveLength(1)
    expect(body.pagination).toEqual({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    })
  })
})

describe('POST /api/v1/shipments (CARGO_TRACKING)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for invalid body', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: { type: 'CARGO_TRACKING' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  it('returns 404 when label not found', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipment.findUnique.mockResolvedValue(null as never) // shareCode uniqueness check
    mockDb.label.findUnique.mockResolvedValueOnce(null as never)

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: validCargoShipment({ labelId: 'non-existent-label' }),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect(body).toEqual({ error: 'Label not found' })
  })

  it('returns 400 when label status is not SOLD or ACTIVE', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipment.findUnique.mockResolvedValue(null as never)
    mockDb.label.findUnique.mockResolvedValueOnce({
      id: 'label-1',
      deviceId: 'TIP-001',
      status: 'INVENTORY',
      orderLabels: [],
    } as never)

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: validCargoShipment({ labelId: 'label-1' }),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toEqual({ error: 'Label is not available for shipment' })
  })

  it('returns 201 with created shipment on success', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipment.findUnique.mockResolvedValue(null as never) // shareCode check
    mockDb.label.findUnique.mockResolvedValueOnce({
      id: 'label-1',
      deviceId: 'TIP-001',
      status: 'SOLD',
      orderLabels: [],
    } as never)
    mockDb.shipment.findFirst.mockResolvedValueOnce(null as never) // no active shipment

    const createdShipment = {
      id: 'ship-new',
      name: 'Test Cargo Shipment',
      type: 'CARGO_TRACKING',
      status: 'PENDING',
      shareCode: 'ABC12345',
      label: { id: 'label-1', deviceId: 'TIP-001', batteryPct: 85, status: 'SOLD' },
    }
    mockDb.shipment.create.mockResolvedValueOnce(createdShipment as never)
    mockDb.label.update.mockResolvedValueOnce({} as never)

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: validCargoShipment({ labelId: 'label-1' }),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse<{ shipment: { id: string } }>(res)

    expect(status).toBe(201)
    expect(body.shipment).toMatchObject({
      id: 'ship-new',
      name: 'Test Cargo Shipment',
      type: 'CARGO_TRACKING',
      status: 'PENDING',
    })
  })
})

describe('POST /api/v1/shipments (LABEL_DISPATCH)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 when some labels are missing', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipment.findUnique.mockResolvedValue(null as never)
    // Only 1 of 2 requested labels found
    mockDb.label.findMany.mockResolvedValueOnce([
      { id: 'label-1', deviceId: 'TIP-001', status: 'SOLD', orderLabels: [] },
    ] as never)

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: validDispatchShipment({ labelIds: ['label-1', 'label-2'] }),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse<{ error: string; missing: string[] }>(res)

    expect(status).toBe(404)
    expect(body.error).toBe('Labels not found')
    expect(body.missing).toContain('label-2')
  })

  it('returns 201 with dispatch shipment on success', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.shipment.findUnique.mockResolvedValue(null as never)
    mockDb.label.findMany.mockResolvedValueOnce([
      { id: 'label-1', deviceId: 'TIP-001', status: 'SOLD', orderLabels: [] },
      { id: 'label-2', deviceId: 'TIP-002', status: 'SOLD', orderLabels: [] },
    ] as never)
    mockDb.shipmentLabel.findMany.mockResolvedValueOnce([] as never) // no active dispatches

    const createdShipment = {
      id: 'ship-dispatch',
      name: 'Test Label Dispatch',
      type: 'LABEL_DISPATCH',
      status: 'PENDING',
      shareCode: 'ABC12345',
      shipmentLabels: [
        { label: { id: 'label-1', deviceId: 'TIP-001', batteryPct: null, status: 'SOLD' } },
        { label: { id: 'label-2', deviceId: 'TIP-002', batteryPct: null, status: 'SOLD' } },
      ],
    }

    // $transaction receives a callback; we need to execute it with a mock tx
    mockDb.$transaction.mockImplementationOnce(async (fn: (tx: typeof mockDb) => Promise<unknown>) => {
      // Provide a mock tx that mimics prisma transaction client
      const tx = {
        shipment: {
          create: vi.fn().mockResolvedValue({ id: 'ship-dispatch' }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(createdShipment),
        },
        shipmentLabel: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      }
      return fn(tx as never)
    })

    const req = createTestRequest('/api/v1/shipments', {
      method: 'POST',
      body: validDispatchShipment({ labelIds: ['label-1', 'label-2'] }),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse<{ shipment: { id: string; type: string } }>(res)

    expect(status).toBe(201)
    expect(body.shipment).toMatchObject({
      id: 'ship-dispatch',
      type: 'LABEL_DISPATCH',
      status: 'PENDING',
    })
  })
})
