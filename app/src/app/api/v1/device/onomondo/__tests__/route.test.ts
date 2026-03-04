import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { validOnomonodoPayload } from '@/test/helpers/fixtures'

// Mock rate limiter to always allow
vi.mock('@/lib/rate-limit', () => ({
  rateLimit: vi.fn().mockReturnValue({ success: true, limit: 120, remaining: 119, resetAt: Date.now() + 60000 }),
  RATE_LIMIT_DEVICE: { limit: 120, windowMs: 60000 },
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

// Mock device-report processing
vi.mock('@/lib/device-report', async () => {
  class LocationReportError extends Error {
    statusCode: number
    details?: unknown
    constructor(message: string, statusCode: number, details?: unknown) {
      super(message)
      this.name = 'LocationReportError'
      this.statusCode = statusCode
      this.details = details
    }
  }
  return {
    processLocationReport: vi.fn().mockResolvedValue({
      success: true,
      locationId: 'loc-001',
      shipmentId: 'ship-001',
      deviceId: 'TIP-001',
    }),
    LocationReportError,
  }
})

import { POST } from '../route'
import { processLocationReport } from '@/lib/device-report'

const mockedProcessLocationReport = vi.mocked(processLocationReport)

describe('POST /api/v1/device/onomondo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Authentication ─────────────────────────────────

  it('returns 401 for invalid API key', async () => {
    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: validOnomonodoPayload(),
      headers: { 'X-API-Key': 'wrong-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Invalid API key' })
  })

  // ── Validation ─────────────────────────────────────

  it('returns 400 for invalid JSON', async () => {
    // Send a request with no body at all to trigger JSON parse failure
    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  it('returns 400 for missing iccid', async () => {
    const payload = validOnomonodoPayload()
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { iccid, ...withoutIccid } = payload

    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: withoutIccid,
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  // ── Success path ───────────────────────────────────

  it('calls processLocationReport on valid payload', async () => {
    const payload = validOnomonodoPayload()
    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: payload,
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toMatchObject({ success: true, locationId: 'loc-001' })
    expect(mockedProcessLocationReport).toHaveBeenCalledOnce()
    expect(mockedProcessLocationReport).toHaveBeenCalledWith(
      expect.objectContaining({
        iccid: payload.iccid,
        imei: payload.imei,
        latitude: payload.latitude,
        longitude: payload.longitude,
      })
    )
  })

  it('processes offline_queue entries', async () => {
    const payload = validOnomonodoPayload({
      offline_queue: [
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          latitude: 48.85,
          longitude: 2.35,
          battery_pct: 70,
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          latitude: 48.84,
          longitude: 2.34,
          battery_pct: 68,
        },
      ],
    })

    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: payload,
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    // 1 main report + 2 offline entries = 3 calls
    expect(mockedProcessLocationReport).toHaveBeenCalledTimes(3)
  })

  it('returns offlineProcessed count', async () => {
    const payload = validOnomonodoPayload({
      offline_queue: [
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          latitude: 48.85,
          longitude: 2.35,
          battery_pct: 70,
        },
      ],
    })

    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: payload,
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse<{ offlineProcessed: number }>(res)

    expect(status).toBe(200)
    expect(body.offlineProcessed).toBe(1)
  })
})
