import { describe, it, expect } from 'vitest'
import { savedAddressSchema, updateSavedAddressSchema } from '@/lib/validations/address'

// ---------------------------------------------------------------------------
// savedAddressSchema
// ---------------------------------------------------------------------------
describe('savedAddressSchema', () => {
  const validAddress = {
    label: 'Home',
    name: 'John Doe',
    line1: '123 Main St',
    city: 'London',
    postalCode: 'SW1A 1AA',
    country: 'GB',
  }

  describe('valid inputs', () => {
    it('accepts a minimal valid address', () => {
      const result = savedAddressSchema.safeParse(validAddress)
      expect(result.success).toBe(true)
    })

    it('accepts an address with all optional fields', () => {
      const result = savedAddressSchema.safeParse({
        ...validAddress,
        line2: 'Apt 4B',
        state: 'Greater London',
      })
      expect(result.success).toBe(true)
    })

    it('accepts line2 as empty string', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line2: '' })
      expect(result.success).toBe(true)
    })

    it('accepts state as empty string', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, state: '' })
      expect(result.success).toBe(true)
    })

    it('accepts label at max length (100 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, label: 'L'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('accepts name at max length (200 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, name: 'N'.repeat(200) })
      expect(result.success).toBe(true)
    })

    it('accepts line1 at max length (300 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line1: 'A'.repeat(300) })
      expect(result.success).toBe(true)
    })

    it('accepts line2 at max length (300 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line2: 'B'.repeat(300) })
      expect(result.success).toBe(true)
    })

    it('accepts city at max length (100 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, city: 'C'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('accepts state at max length (100 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, state: 'S'.repeat(100) })
      expect(result.success).toBe(true)
    })

    it('accepts postalCode at max length (20 chars)', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, postalCode: 'P'.repeat(20) })
      expect(result.success).toBe(true)
    })

    it('accepts a two-letter country code', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, country: 'US' })
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects missing label', () => {
      const { label, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty label', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, label: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Label is required')
      }
    })

    it('rejects label exceeding 100 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, label: 'L'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects missing name', () => {
      const { name, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, name: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required')
      }
    })

    it('rejects name exceeding 200 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, name: 'N'.repeat(201) })
      expect(result.success).toBe(false)
    })

    it('rejects missing line1', () => {
      const { line1, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty line1', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line1: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Address is required')
      }
    })

    it('rejects line1 exceeding 300 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line1: 'A'.repeat(301) })
      expect(result.success).toBe(false)
    })

    it('rejects line2 exceeding 300 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, line2: 'B'.repeat(301) })
      expect(result.success).toBe(false)
    })

    it('rejects missing city', () => {
      const { city, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty city', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, city: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('City is required')
      }
    })

    it('rejects city exceeding 100 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, city: 'C'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects state exceeding 100 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, state: 'S'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects missing postalCode', () => {
      const { postalCode, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects empty postalCode', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, postalCode: '' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Postal code is required')
      }
    })

    it('rejects postalCode exceeding 20 characters', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, postalCode: 'P'.repeat(21) })
      expect(result.success).toBe(false)
    })

    it('rejects missing country', () => {
      const { country, ...rest } = validAddress
      const result = savedAddressSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('rejects single-character country code', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, country: 'G' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select a country')
      }
    })

    it('rejects three-character country code', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, country: 'GBR' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select a country')
      }
    })

    it('rejects empty country', () => {
      const result = savedAddressSchema.safeParse({ ...validAddress, country: '' })
      expect(result.success).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// updateSavedAddressSchema (partial)
// ---------------------------------------------------------------------------
describe('updateSavedAddressSchema', () => {
  it('accepts an empty object (all fields optional via .partial())', () => {
    const result = updateSavedAddressSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts updating only label', () => {
    const result = updateSavedAddressSchema.safeParse({ label: 'Office' })
    expect(result.success).toBe(true)
  })

  it('accepts updating only name', () => {
    const result = updateSavedAddressSchema.safeParse({ name: 'Jane Smith' })
    expect(result.success).toBe(true)
  })

  it('accepts updating only city and postalCode', () => {
    const result = updateSavedAddressSchema.safeParse({ city: 'Manchester', postalCode: 'M1 1AA' })
    expect(result.success).toBe(true)
  })

  it('accepts updating only country', () => {
    const result = updateSavedAddressSchema.safeParse({ country: 'DE' })
    expect(result.success).toBe(true)
  })

  it('accepts updating all fields at once', () => {
    const result = updateSavedAddressSchema.safeParse({
      label: 'Warehouse',
      name: 'ACME Corp',
      line1: '789 Industrial Park',
      line2: 'Unit 5',
      city: 'Birmingham',
      state: 'West Midlands',
      postalCode: 'B1 1AA',
      country: 'GB',
    })
    expect(result.success).toBe(true)
  })

  it('still validates constraints when fields are present — rejects empty label', () => {
    const result = updateSavedAddressSchema.safeParse({ label: '' })
    expect(result.success).toBe(false)
  })

  it('still validates constraints — rejects label exceeding 100 chars', () => {
    const result = updateSavedAddressSchema.safeParse({ label: 'L'.repeat(101) })
    expect(result.success).toBe(false)
  })

  it('still validates constraints — rejects invalid country code length', () => {
    const result = updateSavedAddressSchema.safeParse({ country: 'GBR' })
    expect(result.success).toBe(false)
  })

  it('still validates constraints — rejects postalCode exceeding 20 chars', () => {
    const result = updateSavedAddressSchema.safeParse({ postalCode: 'P'.repeat(21) })
    expect(result.success).toBe(false)
  })
})
