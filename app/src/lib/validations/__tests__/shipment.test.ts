import { describe, it, expect } from 'vitest'
import {
  createCargoShipmentSchema,
  createDispatchShipmentSchema,
  createShipmentSchema,
  updateShipmentSchema,
} from '@/lib/validations/shipment'

// ---------------------------------------------------------------------------
// Shared address fixtures
// ---------------------------------------------------------------------------
const validAddressFields = {
  originAddress: '123 Warehouse St',
  originLat: 48.8566,
  originLng: 2.3522,
  destinationAddress: '456 Customer Ave',
  destinationLat: 40.7128,
  destinationLng: -74.006,
}

// ---------------------------------------------------------------------------
// createCargoShipmentSchema
// ---------------------------------------------------------------------------
describe('createCargoShipmentSchema', () => {
  const validCargo = {
    name: 'Test Cargo',
    labelId: 'label-001',
    ...validAddressFields,
  }

  describe('valid inputs', () => {
    it('accepts minimal valid cargo shipment (type defaults)', () => {
      const result = createCargoShipmentSchema.safeParse(validCargo)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.type).toBe('CARGO_TRACKING')
      }
    })

    it('accepts explicit CARGO_TRACKING type', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, type: 'CARGO_TRACKING' })
      expect(result.success).toBe(true)
    })

    it('accepts consigneeEmail as valid email', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneeEmail: 'user@example.com' })
      expect(result.success).toBe(true)
    })

    it('accepts consigneeEmail as empty string', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneeEmail: '' })
      expect(result.success).toBe(true)
    })

    it('accepts consigneePhone', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneePhone: '+1234567890' })
      expect(result.success).toBe(true)
    })

    it('accepts consigneePhone as empty string', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneePhone: '' })
      expect(result.success).toBe(true)
    })

    it('accepts photoUrls up to 5', () => {
      const result = createCargoShipmentSchema.safeParse({
        ...validCargo,
        photoUrls: ['url1', 'url2', 'url3', 'url4', 'url5'],
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty photoUrls array', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, photoUrls: [] })
      expect(result.success).toBe(true)
    })

    it('defaults originAddress and destinationAddress to empty string when omitted', () => {
      const { originAddress, destinationAddress, ...rest } = validCargo
      const result = createCargoShipmentSchema.safeParse(rest)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.originAddress).toBe('')
        expect(result.data.destinationAddress).toBe('')
      }
    })

    it('accepts a name at max length (200 chars)', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, name: 'A'.repeat(200) })
      expect(result.success).toBe(true)
    })

    it('accepts boundary latitude -90', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, originLat: -90 })
      expect(result.success).toBe(true)
    })

    it('accepts boundary longitude 180', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, destinationLng: 180 })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects missing name', () => {
      const { name, ...rest } = validCargo
      const result = createCargoShipmentSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects name exceeding 200 characters', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, name: 'A'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('rejects missing labelId', () => {
      const { labelId, ...rest } = validCargo
      const result = createCargoShipmentSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty labelId', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, labelId: '' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid consigneeEmail', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneeEmail: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects consigneePhone exceeding 30 characters', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, consigneePhone: '1'.repeat(31) })
      expect(result.success).toBe(false)
    })

    it('rejects more than 5 photoUrls', () => {
      const result = createCargoShipmentSchema.safeParse({
        ...validCargo,
        photoUrls: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6'],
      })
      expect(result.success).toBe(false)
    })

    it('rejects originLat out of range', () => {
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, originLat: 91 }).success).toBe(false)
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, originLat: -91 }).success).toBe(false)
    })

    it('rejects originLng out of range', () => {
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, originLng: 181 }).success).toBe(false)
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, originLng: -181 }).success).toBe(false)
    })

    it('rejects destinationLat out of range', () => {
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, destinationLat: 91 }).success).toBe(false)
    })

    it('rejects destinationLng out of range', () => {
      expect(createCargoShipmentSchema.safeParse({ ...validCargo, destinationLng: 181 }).success).toBe(false)
    })

    it('rejects wrong type literal', () => {
      const result = createCargoShipmentSchema.safeParse({ ...validCargo, type: 'LABEL_DISPATCH' })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// createDispatchShipmentSchema
// ---------------------------------------------------------------------------
describe('createDispatchShipmentSchema', () => {
  const validDispatch = {
    type: 'LABEL_DISPATCH' as const,
    name: 'Test Dispatch',
    labelIds: ['label-001', 'label-002'],
    ...validAddressFields,
  }

  describe('valid inputs', () => {
    it('accepts a valid dispatch shipment', () => {
      const result = createDispatchShipmentSchema.safeParse(validDispatch)
      expect(result.success).toBe(true)
    })

    it('accepts a single label ID', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, labelIds: ['label-001'] })
      expect(result.success).toBe(true)
    })

    it('accepts many label IDs', () => {
      const ids = Array.from({ length: 50 }, (_, i) => `label-${i}`)
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, labelIds: ids })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects missing type', () => {
      const { type, ...rest } = validDispatch
      const result = createDispatchShipmentSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects wrong type', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, type: 'CARGO_TRACKING' })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, name: '' })
      expect(result.success).toBe(false)
    })

    it('rejects name exceeding 200 characters', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, name: 'X'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('rejects empty labelIds array', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, labelIds: [] })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select at least one label')
      }
    })

    it('rejects labelIds containing empty string', () => {
      const result = createDispatchShipmentSchema.safeParse({ ...validDispatch, labelIds: ['label-001', ''] })
      expect(result.success).toBe(false)
    })

    it('rejects missing labelIds', () => {
      const { labelIds, ...rest } = validDispatch
      const result = createDispatchShipmentSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// createShipmentSchema (discriminated union)
// ---------------------------------------------------------------------------
describe('createShipmentSchema', () => {
  it('accepts a CARGO_TRACKING shipment', () => {
    const result = createShipmentSchema.safeParse({
      type: 'CARGO_TRACKING',
      name: 'Cargo A',
      labelId: 'lbl-1',
      originLat: 0,
      originLng: 0,
      destinationLat: 10,
      destinationLng: 10,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('CARGO_TRACKING')
    }
  })

  it('accepts a LABEL_DISPATCH shipment', () => {
    const result = createShipmentSchema.safeParse({
      type: 'LABEL_DISPATCH',
      name: 'Dispatch B',
      labelIds: ['lbl-1'],
      originLat: 0,
      originLng: 0,
      destinationLat: 10,
      destinationLng: 10,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('LABEL_DISPATCH')
    }
  })

  it('rejects an unknown type', () => {
    const result = createShipmentSchema.safeParse({
      type: 'UNKNOWN',
      name: 'Something',
      originLat: 0,
      originLng: 0,
      destinationLat: 10,
      destinationLng: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects CARGO_TRACKING with labelIds instead of labelId', () => {
    const result = createShipmentSchema.safeParse({
      type: 'CARGO_TRACKING',
      name: 'Cargo',
      labelIds: ['lbl-1'],
      originLat: 0,
      originLng: 0,
      destinationLat: 10,
      destinationLng: 10,
    })
    expect(result.success).toBe(false)
  })

  it('rejects LABEL_DISPATCH with labelId instead of labelIds', () => {
    const result = createShipmentSchema.safeParse({
      type: 'LABEL_DISPATCH',
      name: 'Dispatch',
      labelId: 'lbl-1',
      originLat: 0,
      originLng: 0,
      destinationLat: 10,
      destinationLng: 10,
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// updateShipmentSchema
// ---------------------------------------------------------------------------
describe('updateShipmentSchema', () => {
  it('accepts a completely empty object (all fields optional)', () => {
    const result = updateShipmentSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts updating just the name', () => {
    const result = updateShipmentSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('accepts updating address fields', () => {
    const result = updateShipmentSchema.safeParse({
      originAddress: 'New Origin',
      originLat: 50,
      originLng: 10,
      destinationAddress: 'New Dest',
      destinationLat: 52,
      destinationLng: 13,
    })
    expect(result.success).toBe(true)
  })

  it('accepts updating shareEnabled', () => {
    const result = updateShipmentSchema.safeParse({ shareEnabled: true })
    expect(result.success).toBe(true)
  })

  it('accepts all valid status values', () => {
    const statuses = ['PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'] as const
    for (const status of statuses) {
      const result = updateShipmentSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('accepts consigneePhone within limit', () => {
    const result = updateShipmentSchema.safeParse({ consigneePhone: '+1234567890' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateShipmentSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 200 characters', () => {
    const result = updateShipmentSchema.safeParse({ name: 'X'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status value', () => {
    const result = updateShipmentSchema.safeParse({ status: 'INVALID_STATUS' })
    expect(result.success).toBe(false)
  })

  it('rejects originLat out of range', () => {
    expect(updateShipmentSchema.safeParse({ originLat: 91 }).success).toBe(false)
    expect(updateShipmentSchema.safeParse({ originLat: -91 }).success).toBe(false)
  })

  it('rejects originLng out of range', () => {
    expect(updateShipmentSchema.safeParse({ originLng: 181 }).success).toBe(false)
  })

  it('rejects destinationLat out of range', () => {
    expect(updateShipmentSchema.safeParse({ destinationLat: 91 }).success).toBe(false)
  })

  it('rejects destinationLng out of range', () => {
    expect(updateShipmentSchema.safeParse({ destinationLng: -181 }).success).toBe(false)
  })

  it('rejects consigneePhone exceeding 30 characters', () => {
    const result = updateShipmentSchema.safeParse({ consigneePhone: '1'.repeat(31) })
    expect(result.success).toBe(false)
  })

  it('rejects shareEnabled as string', () => {
    const result = updateShipmentSchema.safeParse({ shareEnabled: 'true' })
    expect(result.success).toBe(false)
  })
})
