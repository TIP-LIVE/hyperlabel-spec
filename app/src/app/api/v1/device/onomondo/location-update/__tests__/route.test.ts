import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

vi.mock('next/server', async () => {
  const actual = await vi.importActual<typeof import('next/server')>('next/server')
  return {
    ...actual,
    after: vi.fn(async (callback: () => Promise<void> | void) => {
      await callback()
    }),
  }
})

vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true, limit: 120, remaining: 119, resetAt: Date.now() + 60000 }),
  RATE_LIMIT_DEVICE: { limit: 120, windowMs: 60000 },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

vi.mock('@/lib/device-report', async () => ({
  processLocationReport: vi.fn().mockResolvedValue({
    success: true,
    locationId: 'loc-002',
  }),
  shouldSkipDuplicateLocation: vi.fn().mockResolvedValue(false),
  geocodeLocationEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/cell-geolocation', () => ({
  resolveCellTowerLocation: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/db', () => ({
  db: {
    label: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  },
}))

import { POST } from '../route'
import { processLocationReport } from '@/lib/device-report'

const mockedProcessLocationReport = vi.mocked(processLocationReport)

function validLocationUpdatePayload(overrides?: Record<string, unknown>) {
  return {
    type: 'location',
    imei: '351234567890001',
    iccid: '89440000000000001',
    sim_id: 'sim-001',
    location: {
      cell_id: 12345,
      location_area_code: 100,
      accuracy: 150,
      lat: '48.8566',
      lng: '2.3522',
    },
    network: {
      name: 'Onomondo',
      country: 'France',
      country_code: 'FR',
      mcc: '208',
      mnc: '1',
    },
    network_type: 'LTE-M',
    sim_label: 'TIP-001',
    time: new Date().toISOString(),
    ipv4: '127.0.0.1',
    session_id: 'session-001',
    ...overrides,
  }
}

describe('POST /api/v1/device/onomondo/location-update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEVICE_API_KEY = 'test-device-api-key'
    delete process.env.ONOMONDO_WEBHOOK_API_KEY
    delete process.env.ONOMONDO_CONNECTOR_API_KEY
    delete process.env.ONOMONDO_WEBHOOK_SECRET
  })

  afterEach(() => {
    delete process.env.ONOMONDO_WEBHOOK_SECRET
  })

  it('returns 401 for invalid credentials', async () => {
    const req = createTestRequest('/api/v1/device/onomondo/location-update', {
      method: 'POST',
      body: validLocationUpdatePayload(),
      headers: { 'X-API-Key': 'wrong-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Invalid webhook credentials' })
  })

  it('accepts a valid webhook secret header', async () => {
    process.env.ONOMONDO_WEBHOOK_SECRET = 'shared-secret'

    const req = createTestRequest('/api/v1/device/onomondo/location-update', {
      method: 'POST',
      body: validLocationUpdatePayload(),
      headers: { 'X-Onomondo-Webhook-Secret': 'shared-secret' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toMatchObject({ success: true, locationId: 'loc-002' })
    expect(mockedProcessLocationReport).toHaveBeenCalledOnce()
  })
})
