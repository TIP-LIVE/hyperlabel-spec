import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { validDeviceReport } from '@/test/helpers/fixtures'
import { LocationReportError } from '@/lib/device-report'

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

// Import the route handler AFTER mocks are set up
import { POST } from '../route'
import { processLocationReport } from '@/lib/device-report'

const mockedProcessLocationReport = vi.mocked(processLocationReport)

describe('POST /api/v1/device/report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Authentication ─────────────────────────────────

  it('returns 401 when no API key is provided', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: validDeviceReport(),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Invalid API key' })
  })

  it('returns 401 when wrong API key is provided', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: validDeviceReport(),
      headers: { 'X-API-Key': 'wrong-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Invalid API key' })
  })

  it('accepts valid API key in X-API-Key header', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: validDeviceReport(),
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toMatchObject({ success: true, locationId: 'loc-001' })
  })

  it('accepts valid API key in ?key= query param', async () => {
    const req = createTestRequest(
      '/api/v1/device/report?key=test-device-api-key',
      {
        method: 'POST',
        body: validDeviceReport(),
      }
    )

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect(body).toMatchObject({ success: true })
  })

  // ── Validation ─────────────────────────────────────

  it('returns 400 for missing body', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      headers: { 'X-API-Key': 'test-device-api-key' },
      // no body
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  it('returns 400 when no device identifier is provided', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: { latitude: 48.8566, longitude: 2.3522 },
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  it('returns 400 for out-of-range latitude', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: validDeviceReport({ latitude: 100 }),
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  // ── Success path ───────────────────────────────────

  it('calls processLocationReport with validated data on success', async () => {
    const reportData = validDeviceReport()
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: reportData,
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    await POST(req)

    expect(mockedProcessLocationReport).toHaveBeenCalledOnce()
    expect(mockedProcessLocationReport).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: reportData.deviceId,
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        battery: reportData.battery,
      })
    )
  })

  // ── Error handling ─────────────────────────────────

  it('returns LocationReportError status code when processLocationReport throws', async () => {
    // Re-import LocationReportError from the mocked module to get the same class
    const { LocationReportError: MockedError } = await import('@/lib/device-report')
    mockedProcessLocationReport.mockRejectedValueOnce(
      new MockedError('Device not found', 404)
    )

    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: validDeviceReport(),
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect(body).toMatchObject({ error: 'Device not found' })
  })
})
