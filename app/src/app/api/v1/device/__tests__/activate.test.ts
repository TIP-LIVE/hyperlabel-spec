import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
} from '@/test/helpers/auth-mock'

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    label: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { POST } from '../activate/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

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

const fakeLabel = {
  id: 'label-001',
  deviceId: 'TIP-001',
  status: 'SOLD',
  orderLabels: [
    {
      order: { orgId: 'org_test_001', userId: 'db-user-001' },
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: return a DB user for auth lookup
  mockedDb.user.findUnique.mockResolvedValue(fakeDbUser as never)
})

describe('POST /api/v1/device/activate', () => {
  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    mockAuthenticatedUser()

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: {},
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Validation failed')
  })

  it('returns 404 when label not found', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'NONEXISTENT' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect((body as { error: string }).error).toBe('Label not found')
  })

  it('returns 400 when label is INVENTORY', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue({
      ...fakeLabel,
      status: 'INVENTORY',
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Label not purchased')
  })

  it('returns 400 when label is already ACTIVE', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue({
      ...fakeLabel,
      status: 'ACTIVE',
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Label already active')
  })

  it('returns 400 when label is DEPLETED', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue({
      ...fakeLabel,
      status: 'DEPLETED',
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Label depleted')
  })

  it('returns 403 when user does not own the label', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue({
      ...fakeLabel,
      orderLabels: [
        { order: { orgId: 'other-org', userId: 'other-user' } },
      ],
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect((body as { error: string }).error).toBe('Forbidden')
  })

  it('activates label successfully', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue(fakeLabel as never)
    mockedDb.label.update.mockResolvedValue({
      id: 'label-001',
      deviceId: 'TIP-001',
      status: 'ACTIVE',
      activatedAt: new Date(),
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; label: { status: string }; shipment: null }
    expect(typedBody.success).toBe(true)
    expect(typedBody.label.status).toBe('ACTIVE')
    expect(typedBody.shipment).toBeNull()
  })

  it('activates and links to shipment when shipmentId provided', async () => {
    mockAuthenticatedUser()
    mockedDb.label.findUnique.mockResolvedValue(fakeLabel as never)
    mockedDb.label.update.mockResolvedValue({
      id: 'label-001',
      deviceId: 'TIP-001',
      status: 'ACTIVE',
      activatedAt: new Date(),
    } as never)
    mockedDb.shipment.findUnique.mockResolvedValue({
      id: 'ship-001',
      userId: 'db-user-001',
      orgId: 'org_test_001',
      shareCode: 'ABC123',
    } as never)
    mockedDb.shipment.update.mockResolvedValue({
      id: 'ship-001',
      shareCode: 'ABC123',
    } as never)

    const req = createTestRequest('/api/v1/device/activate', {
      method: 'POST',
      body: { deviceId: 'TIP-001', shipmentId: 'ship-001' },
    })
    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; shipment: { id: string } }
    expect(typedBody.success).toBe(true)
    expect(typedBody.shipment.id).toBe('ship-001')
  })
})
