import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { GET } from '../check-delivery/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cron/check-delivery', () => {
  it('returns 401 without valid CRON_SECRET', async () => {
    const req = createTestRequest('/api/cron/check-delivery')
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns 401 with wrong bearer token', async () => {
    const req = createTestRequest('/api/cron/check-delivery', {
      headers: { Authorization: 'Bearer wrong-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns success with checked count', async () => {
    mockedDb.shipment.findMany.mockResolvedValue([] as never)

    const req = createTestRequest('/api/cron/check-delivery', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; checked: number; deliveriesDetected: number }
    expect(typedBody.success).toBe(true)
    expect(typedBody.checked).toBe(0)
    expect(typedBody.deliveriesDetected).toBe(0)
  })

  it('detects delivery when locations within geofence', async () => {
    // Destination coordinates
    const destLat = 48.8566
    const destLng = 2.3522

    // Locations within 1500m of destination, spanning > 30 minutes
    const now = new Date()
    const thirtyFiveMinAgo = new Date(now.getTime() - 35 * 60 * 1000)

    const mockShipment = {
      id: 'ship-001',
      name: 'Test Shipment',
      status: 'IN_TRANSIT',
      userId: 'user-001',
      shareCode: 'abc123',
      destinationAddress: '456 Destination Ave',
      destinationLat: destLat,
      destinationLng: destLng,
      labelId: 'label-001',
      label: {
        deviceId: 'TIP-001',
        locations: [
          {
            latitude: destLat + 0.00001, // ~1m offset
            longitude: destLng + 0.00001,
            recordedAt: now,
          },
          {
            latitude: destLat + 0.00002,
            longitude: destLng - 0.00001,
            recordedAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 min ago
          },
          {
            latitude: destLat - 0.00001,
            longitude: destLng + 0.00002,
            recordedAt: thirtyFiveMinAgo,
          },
        ],
      },
      user: { id: 'user-001' },
    }

    mockedDb.shipment.findMany.mockResolvedValue([mockShipment] as never)
    mockedDb.shipment.update.mockResolvedValue({
      ...mockShipment,
      status: 'DELIVERED',
      deliveredAt: new Date(),
    } as never)

    const req = createTestRequest('/api/cron/check-delivery', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; checked: number; deliveriesDetected: number }
    expect(typedBody.success).toBe(true)
    expect(typedBody.checked).toBe(1)
    expect(typedBody.deliveriesDetected).toBe(1)

    // Verify shipment was updated to DELIVERED
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
})
