import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest } from '@/test/helpers/api'

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn().mockResolvedValue({ orgId: 'org-001' }),
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    user: { findUnique: vi.fn() },
    shipment: { findMany: vi.fn() },
    order: { findMany: vi.fn() },
    notification: { findMany: vi.fn() },
    label: { findMany: vi.fn() },
    savedAddress: { findMany: vi.fn() },
  },
}))

import { GET } from '../export/route'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedDb = vi.mocked(db)

const fakeUser = {
  id: 'user-001',
  email: 'test@tip.live',
  firstName: 'Test',
  lastName: 'User',
  role: 'user',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  notifyLabelActivated: true,
  notifyLowBattery: true,
  notifyNoSignal: true,
  notifyDelivered: true,
  notifyOrderShipped: true,
  notifyShipmentStuck: true,
  notifyReminders: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedDb.user.findUnique.mockResolvedValue(fakeUser as never)
  mockedDb.shipment.findMany.mockResolvedValue([] as never)
  mockedDb.order.findMany.mockResolvedValue([] as never)
  mockedDb.notification.findMany.mockResolvedValue([] as never)
  mockedDb.label.findMany.mockResolvedValue([] as never)
  mockedDb.savedAddress.findMany.mockResolvedValue([] as never)
})

describe('GET /api/v1/user/export', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetCurrentUser.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/user/export')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns JSON export by default', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)

    const req = createTestRequest('/api/v1/user/export')
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/json')
    expect(res.headers.get('Content-Disposition')).toContain('tip-data-export')

    const body = JSON.parse(await res.text())
    expect(body.exportVersion).toBe('1.0')
    expect(body.user).toBeDefined()
    expect(body.shipments).toEqual([])
    expect(body.orders).toEqual([])
    expect(body.labels).toEqual([])
    expect(body.notifications).toEqual([])
    expect(body.savedAddresses).toEqual([])
  })

  it('returns CSV export when format=csv', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)

    const req = createTestRequest('/api/v1/user/export?format=csv')
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('text/csv')

    const text = await res.text()
    expect(text).toContain('--- SHIPMENTS ---')
    expect(text).toContain('--- LOCATION EVENTS ---')
    expect(text).toContain('--- ORDERS ---')
    expect(text).toContain('--- LABELS ---')
    expect(text).toContain('--- SAVED ADDRESSES ---')
  })

  it('includes saved addresses in JSON export', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)
    mockedDb.savedAddress.findMany.mockResolvedValue([
      {
        id: 'addr-001',
        label: 'Home',
        name: 'Test User',
        line1: '123 Main St',
        line2: null,
        city: 'NYC',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        isDefault: true,
        createdAt: new Date('2026-02-01'),
      },
    ] as never)

    const req = createTestRequest('/api/v1/user/export')
    const res = await GET(req)

    const body = JSON.parse(await res.text())
    expect(body.savedAddresses).toHaveLength(1)
    expect(body.savedAddresses[0].label).toBe('Home')
    expect(body.savedAddresses[0].city).toBe('NYC')
  })

  it('includes shipments with location events in JSON export', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)
    mockedDb.shipment.findMany.mockResolvedValue([
      {
        id: 'ship-001',
        name: 'Test Cargo',
        status: 'IN_TRANSIT',
        originAddress: 'NYC',
        destinationAddress: 'LA',
        shareCode: 'ABC123',
        shareEnabled: true,
        photoUrls: [],
        createdAt: new Date('2026-01-15'),
        deliveredAt: null,
        label: { deviceId: 'TIP-001', imei: null, status: 'ACTIVE', batteryPct: 85 },
        locations: [
          {
            latitude: 40.7128,
            longitude: -74.006,
            accuracyM: 10,
            batteryPct: 85,
            altitude: null,
            speed: null,
            recordedAt: new Date('2026-01-16T10:00:00Z'),
            receivedAt: new Date('2026-01-16T10:01:00Z'),
            isOfflineSync: false,
          },
        ],
      },
    ] as never)

    const req = createTestRequest('/api/v1/user/export')
    const res = await GET(req)

    const body = JSON.parse(await res.text())
    expect(body.shipments).toHaveLength(1)
    expect(body.shipments[0].name).toBe('Test Cargo')
    expect(body.shipments[0].locationEvents).toHaveLength(1)
    expect(body.shipments[0].locationEvents[0].latitude).toBe(40.7128)
  })
})
