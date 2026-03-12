import { describe, it, expect } from 'vitest'
import {
  deviceReportSchema,
  validateLocation,
  activateLabelSchema,
  registerLabelsSchema,
  onomondoConnectorSchema,
} from '@/lib/validations/device'

// ---------------------------------------------------------------------------
// deviceReportSchema
// ---------------------------------------------------------------------------
describe('deviceReportSchema', () => {
  const base = { latitude: 48.8566, longitude: 2.3522 }

  describe('valid inputs', () => {
    it('accepts a report with deviceId', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'DEV-001' })
      expect(result.success).toBe(true)
    })

    it('accepts a report with imei only', () => {
      const result = deviceReportSchema.safeParse({ ...base, imei: '123456789012345' })
      expect(result.success).toBe(true)
    })

    it('accepts a report with iccid only', () => {
      const result = deviceReportSchema.safeParse({ ...base, iccid: '8944110000000000001' })
      expect(result.success).toBe(true)
    })

    it('accepts all optional fields', () => {
      const result = deviceReportSchema.safeParse({
        ...base,
        deviceId: 'DEV-001',
        accuracy: 10,
        altitude: 150,
        speed: 5.5,
        battery: 85,
        recordedAt: '2026-02-15T10:30:00+02:00',
        cellLatitude: 48.86,
        cellLongitude: 2.35,
        isOfflineSync: true,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isOfflineSync).toBe(true)
      }
    })

    it('defaults isOfflineSync to false when omitted', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'DEV-001' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isOfflineSync).toBe(false)
      }
    })

    it('accepts boundary latitude values', () => {
      expect(deviceReportSchema.safeParse({ deviceId: 'D', latitude: -90, longitude: 0 }).success).toBe(true)
      expect(deviceReportSchema.safeParse({ deviceId: 'D', latitude: 90, longitude: 0 }).success).toBe(true)
    })

    it('accepts boundary longitude values', () => {
      expect(deviceReportSchema.safeParse({ deviceId: 'D', latitude: 0, longitude: -180 }).success).toBe(true)
      expect(deviceReportSchema.safeParse({ deviceId: 'D', latitude: 0, longitude: 180 }).success).toBe(true)
    })

    it('accepts battery at 0 and 100', () => {
      expect(deviceReportSchema.safeParse({ ...base, deviceId: 'D', battery: 0 }).success).toBe(true)
      expect(deviceReportSchema.safeParse({ ...base, deviceId: 'D', battery: 100 }).success).toBe(true)
    })

    it('accepts speed at 0', () => {
      expect(deviceReportSchema.safeParse({ ...base, deviceId: 'D', speed: 0 }).success).toBe(true)
    })

    it('accepts ISO 8601 datetime with offset for recordedAt', () => {
      const result = deviceReportSchema.safeParse({
        ...base,
        deviceId: 'D',
        recordedAt: '2026-01-15T08:00:00Z',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects when none of deviceId, imei, iccid is provided', () => {
      const result = deviceReportSchema.safeParse(base)
      expect(result.success).toBe(false)
    })

    it('rejects empty string deviceId', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: '' })
      expect(result.success).toBe(false)
    })

    it('rejects empty string imei', () => {
      const result = deviceReportSchema.safeParse({ ...base, imei: '' })
      expect(result.success).toBe(false)
    })

    it('rejects empty string iccid', () => {
      const result = deviceReportSchema.safeParse({ ...base, iccid: '' })
      expect(result.success).toBe(false)
    })

    it('rejects latitude below -90', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: -91, longitude: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects latitude above 90', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: 91, longitude: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects longitude below -180', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: 0, longitude: -181 })
      expect(result.success).toBe(false)
    })

    it('rejects longitude above 180', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: 0, longitude: 181 })
      expect(result.success).toBe(false)
    })

    it('rejects missing latitude', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', longitude: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects missing longitude', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects negative accuracy', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', accuracy: -5 })
      expect(result.success).toBe(false)
    })

    it('rejects zero accuracy (must be positive)', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', accuracy: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects negative speed', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', speed: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects battery below 0', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', battery: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects battery above 100', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', battery: 101 })
      expect(result.success).toBe(false)
    })

    it('rejects non-datetime string for recordedAt', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', recordedAt: 'not-a-date' })
      expect(result.success).toBe(false)
    })

    it('rejects string latitude', () => {
      const result = deviceReportSchema.safeParse({ deviceId: 'D', latitude: '48.8', longitude: 2.3 })
      expect(result.success).toBe(false)
    })

    it('rejects cellLatitude out of range', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', cellLatitude: 91 })
      expect(result.success).toBe(false)
    })

    it('rejects cellLongitude out of range', () => {
      const result = deviceReportSchema.safeParse({ ...base, deviceId: 'D', cellLongitude: 200 })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// validateLocation
// ---------------------------------------------------------------------------
describe('validateLocation', () => {
  it('returns true for a valid location', () => {
    expect(validateLocation(48.8566, 2.3522)).toBe(true)
  })

  it('returns true for New York coordinates', () => {
    expect(validateLocation(40.7128, -74.006)).toBe(true)
  })

  it('returns true for Sydney coordinates', () => {
    expect(validateLocation(-33.8688, 151.2093)).toBe(true)
  })

  it('returns false for null island (0, 0)', () => {
    expect(validateLocation(0, 0)).toBe(false)
  })

  it('returns true for London coordinates (no longer rejected)', () => {
    expect(validateLocation(51.5074, -0.1278)).toBe(true)
  })

  it('returns true for coordinates near London', () => {
    expect(validateLocation(51.50745, -0.12785)).toBe(true)
  })

  it('returns true for London coordinates further out', () => {
    expect(validateLocation(51.508, -0.128)).toBe(true)
  })

  it('returns false for latitude out of range (> 90)', () => {
    expect(validateLocation(91, 0)).toBe(false)
  })

  it('returns false for latitude out of range (< -90)', () => {
    expect(validateLocation(-91, 0)).toBe(false)
  })

  it('returns false for longitude out of range (> 180)', () => {
    expect(validateLocation(0, 181)).toBe(false)
  })

  it('returns false for longitude out of range (< -180)', () => {
    expect(validateLocation(0, -181)).toBe(false)
  })

  it('returns false for NaN latitude', () => {
    expect(validateLocation(NaN, 10)).toBe(false)
  })

  it('returns false for NaN longitude', () => {
    expect(validateLocation(10, NaN)).toBe(false)
  })

  it('returns false for Infinity latitude', () => {
    expect(validateLocation(Infinity, 10)).toBe(false)
  })

  it('returns false for -Infinity longitude', () => {
    expect(validateLocation(10, -Infinity)).toBe(false)
  })

  it('returns true for boundary latitude -90', () => {
    expect(validateLocation(-90, 50)).toBe(true)
  })

  it('returns true for boundary latitude 90', () => {
    expect(validateLocation(90, 50)).toBe(true)
  })

  it('returns true for boundary longitude -180', () => {
    expect(validateLocation(50, -180)).toBe(true)
  })

  it('returns true for boundary longitude 180', () => {
    expect(validateLocation(50, 180)).toBe(true)
  })

  it('returns true when only latitude is 0 (not null island)', () => {
    expect(validateLocation(0, 30)).toBe(true)
  })

  it('returns true when only longitude is 0 (not null island)', () => {
    expect(validateLocation(30, 0)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// activateLabelSchema
// ---------------------------------------------------------------------------
describe('activateLabelSchema', () => {
  it('accepts valid deviceId', () => {
    const result = activateLabelSchema.safeParse({ deviceId: 'DEV-001' })
    expect(result.success).toBe(true)
  })

  it('accepts deviceId with optional shipmentId', () => {
    const result = activateLabelSchema.safeParse({ deviceId: 'DEV-001', shipmentId: 'ship-123' })
    expect(result.success).toBe(true)
  })

  it('accepts deviceId without shipmentId', () => {
    const result = activateLabelSchema.safeParse({ deviceId: 'DEV-001' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.shipmentId).toBeUndefined()
    }
  })

  it('rejects missing deviceId', () => {
    const result = activateLabelSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty string deviceId', () => {
    const result = activateLabelSchema.safeParse({ deviceId: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Device ID is required')
    }
  })
})

// ---------------------------------------------------------------------------
// registerLabelsSchema
// ---------------------------------------------------------------------------
describe('registerLabelsSchema', () => {
  it('accepts a single device ID', () => {
    const result = registerLabelsSchema.safeParse({ deviceIds: ['DEV-001'] })
    expect(result.success).toBe(true)
  })

  it('accepts multiple device IDs', () => {
    const result = registerLabelsSchema.safeParse({ deviceIds: ['DEV-001', 'DEV-002', 'DEV-003'] })
    expect(result.success).toBe(true)
  })

  it('accepts exactly 100 device IDs', () => {
    const ids = Array.from({ length: 100 }, (_, i) => `DEV-${String(i + 1).padStart(3, '0')}`)
    const result = registerLabelsSchema.safeParse({ deviceIds: ids })
    expect(result.success).toBe(true)
  })

  it('rejects an empty array', () => {
    const result = registerLabelsSchema.safeParse({ deviceIds: [] })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('At least one device ID is required')
    }
  })

  it('rejects more than 100 device IDs', () => {
    const ids = Array.from({ length: 101 }, (_, i) => `DEV-${i}`)
    const result = registerLabelsSchema.safeParse({ deviceIds: ids })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Maximum 100 labels per request')
    }
  })

  it('rejects array containing empty string', () => {
    const result = registerLabelsSchema.safeParse({ deviceIds: ['DEV-001', ''] })
    expect(result.success).toBe(false)
  })

  it('rejects missing deviceIds field', () => {
    const result = registerLabelsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// onomondoConnectorSchema
// ---------------------------------------------------------------------------
describe('onomondoConnectorSchema', () => {
  const validPayload = {
    iccid: '8944110000000000001',
    imei: '123456789012345',
    latitude: 48.8566,
    longitude: 2.3522,
    timestamp: '2026-02-15T10:30:00Z',
  }

  describe('valid inputs', () => {
    it('accepts minimal valid payload', () => {
      const result = onomondoConnectorSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('defaults offline_queue to empty array when omitted', () => {
      const result = onomondoConnectorSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.offline_queue).toEqual([])
      }
    })

    it('accepts all optional fields', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        onomondo_latitude: 48.86,
        onomondo_longitude: 2.35,
        battery: 75,
        signal_strength: -80,
      })
      expect(result.success).toBe(true)
    })

    it('accepts payload with offline_queue entries', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        offline_queue: [
          { timestamp: '2026-02-15T10:25:00Z', latitude: 48.85, longitude: 2.35 },
          { timestamp: '2026-02-15T10:20:00Z', latitude: 48.84, longitude: 2.34, battery_pct: 60 },
        ],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.offline_queue).toHaveLength(2)
      }
    })

    it('accepts battery at boundary values', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, battery: 0 }).success).toBe(true)
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, battery: 100 }).success).toBe(true)
    })

    it('accepts negative signal_strength', () => {
      const result = onomondoConnectorSchema.safeParse({ ...validPayload, signal_strength: -120 })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects missing iccid', () => {
      const { iccid, ...rest } = validPayload
      const result = onomondoConnectorSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty iccid', () => {
      const result = onomondoConnectorSchema.safeParse({ ...validPayload, iccid: '' })
      expect(result.success).toBe(false)
    })

    it('rejects missing imei', () => {
      const { imei, ...rest } = validPayload
      const result = onomondoConnectorSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty imei', () => {
      const result = onomondoConnectorSchema.safeParse({ ...validPayload, imei: '' })
      expect(result.success).toBe(false)
    })

    it('rejects missing timestamp', () => {
      const { timestamp, ...rest } = validPayload
      const result = onomondoConnectorSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects latitude out of range', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, latitude: 91 }).success).toBe(false)
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, latitude: -91 }).success).toBe(false)
    })

    it('rejects longitude out of range', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, longitude: 181 }).success).toBe(false)
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, longitude: -181 }).success).toBe(false)
    })

    it('rejects onomondo_latitude out of range', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, onomondo_latitude: 91 }).success).toBe(false)
    })

    it('rejects onomondo_longitude out of range', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, onomondo_longitude: 181 }).success).toBe(false)
    })

    it('rejects battery below 0', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, battery: -1 }).success).toBe(false)
    })

    it('rejects battery above 100', () => {
      expect(onomondoConnectorSchema.safeParse({ ...validPayload, battery: 101 }).success).toBe(false)
    })

    it('rejects offline_queue entry with latitude out of range', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        offline_queue: [{ timestamp: '2026-02-15T10:00:00Z', latitude: 100, longitude: 0 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects offline_queue entry with longitude out of range', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        offline_queue: [{ timestamp: '2026-02-15T10:00:00Z', latitude: 0, longitude: 200 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects offline_queue entry with battery_pct out of range', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        offline_queue: [{ timestamp: '2026-02-15T10:00:00Z', latitude: 0, longitude: 0, battery_pct: 110 }],
      })
      expect(result.success).toBe(false)
    })

    it('rejects offline_queue entry missing timestamp', () => {
      const result = onomondoConnectorSchema.safeParse({
        ...validPayload,
        offline_queue: [{ latitude: 0, longitude: 0 }],
      })
      expect(result.success).toBe(false)
    })
  })
})
