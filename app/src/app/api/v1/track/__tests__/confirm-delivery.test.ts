import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { POST } from '../[code]/confirm-delivery/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/track/[code]/confirm-delivery', () => {
  const makeParams = (code: string) => ({
    params: Promise.resolve({ code }),
  })

  const mockShipment = {
    id: 'ship-001',
    name: 'Test Shipment',
    status: 'IN_TRANSIT',
    shareEnabled: true,
    shareCode: 'abc123',
    consigneeEmail: null,
    destinationAddress: '456 Destination Ave',
    deliveredAt: null,
    userId: 'user-001',
    label: {
      id: 'label-001',
      deviceId: 'TIP-001',
    },
    user: {
      id: 'user-001',
      email: 'shipper@tip.live',
      firstName: 'Test',
      notifyDelivered: true,
    },
    locations: [
      {
        id: 'loc-001',
        latitude: 48.8566,
        longitude: 2.3522,
        recordedAt: new Date('2026-01-16T10:00:00Z'),
      },
    ],
  }

  it('returns 404 for non-existent share code', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/track/nonexistent/confirm-delivery', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('nonexistent'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect((body as { error: string }).error).toBe('Shipment not found')
  })

  it('returns 403 when sharing disabled', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      ...mockShipment,
      shareEnabled: false,
    } as never)

    const req = createTestRequest('/api/v1/track/disabled/confirm-delivery', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('disabled'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect((body as { error: string }).error).toBe('Tracking link is disabled')
  })

  it('returns 400 when already delivered', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      ...mockShipment,
      status: 'DELIVERED',
      deliveredAt: new Date('2026-01-20T10:00:00Z'),
    } as never)

    const req = createTestRequest('/api/v1/track/delivered/confirm-delivery', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('delivered'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Already delivered')
  })

  it('returns 400 when cancelled', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      ...mockShipment,
      status: 'CANCELLED',
    } as never)

    const req = createTestRequest('/api/v1/track/cancelled/confirm-delivery', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('cancelled'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Shipment was cancelled')
  })

  it('marks shipment as DELIVERED on success', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue(mockShipment as never)
    mockedDb.shipment.update.mockResolvedValue({
      id: 'ship-001',
      status: 'DELIVERED',
      deliveredAt: new Date(),
    } as never)

    const req = createTestRequest('/api/v1/track/abc123/confirm-delivery', {
      method: 'POST',
      body: { consigneeName: 'Jane Doe' },
    })
    const res = await POST(req, makeParams('abc123'))
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockedDb.shipment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ship-001' },
        data: expect.objectContaining({
          status: 'DELIVERED',
          deliveredAt: expect.any(Date),
        }),
      })
    )
  })

  it('returns success response with shipment data', async () => {
    const deliveredAt = new Date()
    mockedDb.shipment.findUnique.mockResolvedValue(mockShipment as never)
    mockedDb.shipment.update.mockResolvedValue({
      id: 'ship-001',
      status: 'DELIVERED',
      deliveredAt,
    } as never)

    const req = createTestRequest('/api/v1/track/abc123/confirm-delivery', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as {
      success: boolean
      message: string
      shipment: { id: string; status: string; deliveredAt: string }
    }
    expect(typedBody.success).toBe(true)
    expect(typedBody.message).toBe('Delivery confirmed successfully')
    expect(typedBody.shipment.id).toBe('ship-001')
    expect(typedBody.shipment.status).toBe('DELIVERED')
  })
})
