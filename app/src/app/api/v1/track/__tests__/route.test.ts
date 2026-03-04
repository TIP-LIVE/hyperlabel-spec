import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true, limit: 60, remaining: 59, resetAt: Date.now() + 60000 }),
  RATE_LIMIT_PUBLIC: { limit: 60, windowMs: 60000 },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

import { GET } from '../[code]/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/track/[code]', () => {
  const makeParams = (code: string) => ({
    params: Promise.resolve({ code }),
  })

  const mockShipment = {
    id: 'ship-001',
    name: 'Test Shipment',
    status: 'IN_TRANSIT',
    shareEnabled: true,
    originAddress: '123 Origin St',
    originLat: 51.5074,
    originLng: -0.1278,
    destinationAddress: '456 Destination Ave',
    destinationLat: 48.8566,
    destinationLng: 2.3522,
    deliveredAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    label: {
      deviceId: 'TIP-001',
      batteryPct: 85,
    },
    locations: [
      {
        id: 'loc-001',
        latitude: 50.0,
        longitude: 1.0,
        accuracyM: 10,
        batteryPct: 85,
        recordedAt: new Date('2026-01-16T10:00:00Z'),
        isOfflineSync: false,
      },
    ],
  }

  it('returns shipment data for valid share code', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue(mockShipment as never)

    const req = createTestRequest('/api/v1/track/abc123')
    const res = await GET(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toHaveProperty('shipment')
    expect((body as { shipment: { id: string } }).shipment.id).toBe('ship-001')
    expect((body as { shipment: { name: string } }).shipment.name).toBe('Test Shipment')
    expect((body as { shipment: { status: string } }).shipment.status).toBe('IN_TRANSIT')
    expect((body as { shipment: { locations: unknown[] } }).shipment.locations).toHaveLength(1)
  })

  it('returns 404 for non-existent share code', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/track/nonexistent')
    const res = await GET(req, makeParams('nonexistent'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect((body as { error: string }).error).toBe('Shipment not found')
  })

  it('returns 403 when shareEnabled is false', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      ...mockShipment,
      shareEnabled: false,
    } as never)

    const req = createTestRequest('/api/v1/track/disabled-share')
    const res = await GET(req, makeParams('disabled-share'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect((body as { error: string }).error).toBe('Tracking disabled')
  })

  it('returns 410 when tracking link expired (deliveredAt > 90 days ago)', async () => {
    const deliveredAt = new Date()
    deliveredAt.setDate(deliveredAt.getDate() - 91) // 91 days ago

    mockedDb.shipment.findUnique.mockResolvedValue({
      ...mockShipment,
      status: 'DELIVERED',
      deliveredAt,
    } as never)

    const req = createTestRequest('/api/v1/track/expired-code')
    const res = await GET(req, makeParams('expired-code'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(410)
    expect((body as { error: string }).error).toBe('Tracking link has expired')
  })
})
