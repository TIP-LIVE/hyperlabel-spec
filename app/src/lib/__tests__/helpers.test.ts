import { describe, it, expect, beforeEach, vi } from 'vitest'
import { calculateDistance, LocationReportError } from '@/lib/device-report'
import { rateLimit, getClientIp } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-utils'

// ---------------------------------------------------------------------------
// calculateDistance (Haversine)
// ---------------------------------------------------------------------------
describe('calculateDistance', () => {
  it('returns 0 for the same point', () => {
    expect(calculateDistance(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0)
  })

  it('calculates a known distance: London to Paris (~343 km)', () => {
    const distance = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522)
    // Haversine gives ~343 km for this pair
    expect(distance).toBeGreaterThan(340_000)
    expect(distance).toBeLessThan(350_000)
  })

  it('calculates a known distance: New York to Los Angeles (~3940 km)', () => {
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437)
    expect(distance).toBeGreaterThan(3_900_000)
    expect(distance).toBeLessThan(4_000_000)
  })

  it('calculates distance across the equator', () => {
    // Quito (0.18, -78.47) to Lima (-12.04, -77.03)
    const distance = calculateDistance(0.18, -78.47, -12.04, -77.03)
    expect(distance).toBeGreaterThan(1_350_000)
    expect(distance).toBeLessThan(1_400_000)
  })

  it('calculates distance across the date line', () => {
    // Fiji (−17.7, 178) to Samoa (−13.8, −171.8)
    const distance = calculateDistance(-17.7, 178, -13.8, -171.8)
    expect(distance).toBeGreaterThan(1_100_000)
    expect(distance).toBeLessThan(1_200_000)
  })

  it('returns a short distance for nearby points (~111 m per 0.001 degree lat)', () => {
    // ~0.001 degree latitude = ~111 m
    const distance = calculateDistance(48.8566, 2.3522, 48.8576, 2.3522)
    expect(distance).toBeGreaterThan(100)
    expect(distance).toBeLessThan(120)
  })

  it('is symmetric: distance(A, B) === distance(B, A)', () => {
    const d1 = calculateDistance(51.5074, -0.1278, 48.8566, 2.3522)
    const d2 = calculateDistance(48.8566, 2.3522, 51.5074, -0.1278)
    expect(d1).toBeCloseTo(d2, 6)
  })

  it('handles poles', () => {
    // North pole to south pole: ~20,015 km (half circumference)
    const distance = calculateDistance(90, 0, -90, 0)
    expect(distance).toBeGreaterThan(20_000_000)
    expect(distance).toBeLessThan(20_100_000)
  })

  it('returns distance in meters (not km)', () => {
    // A ~1 degree shift in lat is ~111 km = ~111,000 m
    const distance = calculateDistance(0, 0, 1, 0)
    expect(distance).toBeGreaterThan(110_000)
    expect(distance).toBeLessThan(112_000)
  })
})

// ---------------------------------------------------------------------------
// LocationReportError
// ---------------------------------------------------------------------------
describe('LocationReportError', () => {
  it('extends Error', () => {
    const err = new LocationReportError('test', 400)
    expect(err).toBeInstanceOf(Error)
  })

  it('sets name to LocationReportError', () => {
    const err = new LocationReportError('test message', 404)
    expect(err.name).toBe('LocationReportError')
  })

  it('stores message and statusCode', () => {
    const err = new LocationReportError('Not found', 404)
    expect(err.message).toBe('Not found')
    expect(err.statusCode).toBe(404)
  })

  it('stores optional details', () => {
    const details = { field: 'latitude', reason: 'out of range' }
    const err = new LocationReportError('Invalid', 400, details)
    expect(err.details).toEqual(details)
  })

  it('details is undefined when not provided', () => {
    const err = new LocationReportError('Error', 500)
    expect(err.details).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// rateLimit
// ---------------------------------------------------------------------------
describe('rateLimit', () => {
  beforeEach(() => {
    // Reset the internal store by exploiting window expiry.
    // We call with a unique key per test or use very short windows.
  })

  it('allows the first request', () => {
    const key = `test-rl-first-${Date.now()}`
    const result = rateLimit(key, { limit: 5, windowMs: 60_000 })
    expect(result.success).toBe(true)
    expect(result.limit).toBe(5)
    expect(result.remaining).toBe(4)
  })

  it('decrements remaining on each call', () => {
    const key = `test-rl-decrement-${Date.now()}`
    const config = { limit: 3, windowMs: 60_000 }

    const r1 = rateLimit(key, config)
    expect(r1.remaining).toBe(2)

    const r2 = rateLimit(key, config)
    expect(r2.remaining).toBe(1)

    const r3 = rateLimit(key, config)
    expect(r3.remaining).toBe(0)
  })

  it('rejects requests once limit is exceeded', () => {
    const key = `test-rl-exceed-${Date.now()}`
    const config = { limit: 2, windowMs: 60_000 }

    rateLimit(key, config) // 1
    rateLimit(key, config) // 2
    const r3 = rateLimit(key, config) // 3 -> over limit

    expect(r3.success).toBe(false)
    expect(r3.remaining).toBe(0)
  })

  it('returns success=false for all requests after limit', () => {
    const key = `test-rl-all-after-${Date.now()}`
    const config = { limit: 1, windowMs: 60_000 }

    rateLimit(key, config) // 1 -> allowed
    const r2 = rateLimit(key, config) // 2 -> rejected
    const r3 = rateLimit(key, config) // 3 -> still rejected

    expect(r2.success).toBe(false)
    expect(r3.success).toBe(false)
  })

  it('uses separate counters for different keys', () => {
    const keyA = `test-rl-keyA-${Date.now()}`
    const keyB = `test-rl-keyB-${Date.now()}`
    const config = { limit: 1, windowMs: 60_000 }

    rateLimit(keyA, config) // keyA: 1 (at limit)
    const resultB = rateLimit(keyB, config) // keyB: 1 (at limit, but independent)

    expect(resultB.success).toBe(true)
  })

  it('sets a resetAt timestamp in the future', () => {
    const key = `test-rl-reset-${Date.now()}`
    const now = Date.now()
    const result = rateLimit(key, { limit: 5, windowMs: 10_000 })
    expect(result.resetAt).toBeGreaterThan(now)
    expect(result.resetAt).toBeLessThanOrEqual(now + 10_000 + 100) // small tolerance
  })

  it('returns limit in the result', () => {
    const key = `test-rl-limit-field-${Date.now()}`
    const result = rateLimit(key, { limit: 42, windowMs: 60_000 })
    expect(result.limit).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------
describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('extracts first IP from comma-separated x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1, 172.16.0.1' },
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('trims whitespace from x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  10.0.0.1  , 192.168.1.1' },
    })
    expect(getClientIp(req)).toBe('10.0.0.1')
  })

  it('falls back to x-real-ip header', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('5.6.7.8')
  })

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      },
    })
    expect(getClientIp(req)).toBe('1.1.1.1')
  })

  it('returns 127.0.0.1 when no IP headers are present', () => {
    const req = new Request('http://localhost')
    expect(getClientIp(req)).toBe('127.0.0.1')
  })

  it('handles IPv6 address in x-forwarded-for', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '::1' },
    })
    expect(getClientIp(req)).toBe('::1')
  })

  it('handles IPv6 address in x-real-ip', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '2001:db8::1' },
    })
    expect(getClientIp(req)).toBe('2001:db8::1')
  })
})

// ---------------------------------------------------------------------------
// handleApiError
// ---------------------------------------------------------------------------
describe('handleApiError', () => {
  it('returns 401 for "Unauthorized" error', async () => {
    const response = handleApiError(new Error('Unauthorized'), 'test')
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 403 for "Organization required" error', async () => {
    const response = handleApiError(new Error('Organization required'), 'test')
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Organization required')
  })

  it('returns 403 for "Forbidden: Admin access required" error', async () => {
    const response = handleApiError(new Error('Forbidden: Admin access required'), 'test')
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toBe('Forbidden')
  })

  it('returns 500 for generic Error', async () => {
    const response = handleApiError(new Error('Something broke'), 'test context')
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })

  it('returns 500 for non-Error thrown values', async () => {
    const response = handleApiError('string error', 'test context')
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })

  it('returns 500 for null', async () => {
    const response = handleApiError(null, 'test context')
    expect(response.status).toBe(500)
  })

  it('returns 500 for undefined', async () => {
    const response = handleApiError(undefined, 'test context')
    expect(response.status).toBe(500)
  })

  it('returns 500 for a plain object', async () => {
    const response = handleApiError({ code: 'ENOENT' }, 'test context')
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Internal server error')
  })

  it('logs the error with context for generic errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('Database connection failed')
    handleApiError(err, 'fetching shipments')
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching shipments:', err)
    consoleSpy.mockRestore()
  })

  it('does not log for known auth errors', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    handleApiError(new Error('Unauthorized'), 'test')
    expect(consoleSpy).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('returns a NextResponse instance', () => {
    const response = handleApiError(new Error('test'), 'ctx')
    // NextResponse inherits from Response
    expect(response).toBeInstanceOf(Response)
    expect(response.headers.get('content-type')).toContain('application/json')
  })
})
