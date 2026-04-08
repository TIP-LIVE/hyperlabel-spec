import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Prisma } from '@prisma/client'

// Mock the db module before importing the module under test.
vi.mock('@/lib/db', () => {
  return {
    db: {
      label: {
        findUnique: vi.fn(),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    },
  }
})

import {
  formatDisplayId,
  isDisplayId,
  provisionLabel,
  ProvisionLabelError,
} from '@/lib/label-id'
import { db } from '@/lib/db'

// Typed mock references for ergonomic access
const mockDb = db as unknown as {
  label: {
    findUnique: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

// ---------------------------------------------------------------------------
// formatDisplayId
// ---------------------------------------------------------------------------
describe('formatDisplayId', () => {
  it('formats counter 1 with IMEI 864756085431395 → "000011395"', () => {
    expect(formatDisplayId(1, '864756085431395')).toBe('000011395')
  })

  it('formats counter 42 with IMEI 864756085431395 → "000421395"', () => {
    expect(formatDisplayId(42, '864756085431395')).toBe('000421395')
  })

  it('formats counter 99999 with IMEI ending in "3326" → "999993326"', () => {
    expect(formatDisplayId(99999, '868719074243326')).toBe('999993326')
  })

  it('returns null for null counter', () => {
    expect(formatDisplayId(null, '864756085431395')).toBeNull()
  })

  it('returns null for undefined counter', () => {
    expect(formatDisplayId(undefined, '864756085431395')).toBeNull()
  })

  it('returns null for null IMEI', () => {
    expect(formatDisplayId(1, null)).toBeNull()
  })

  it('returns null for IMEI shorter than 4 chars', () => {
    expect(formatDisplayId(1, '123')).toBeNull()
  })

  it('returns null for counter > 99999', () => {
    expect(formatDisplayId(100000, '864756085431395')).toBeNull()
  })

  it('returns null for negative counter', () => {
    expect(formatDisplayId(-1, '864756085431395')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isDisplayId
// ---------------------------------------------------------------------------
describe('isDisplayId', () => {
  it('returns true for 9 digits', () => {
    expect(isDisplayId('000011395')).toBe(true)
  })

  it('returns false for 8 digits', () => {
    expect(isDisplayId('00011395')).toBe(false)
  })

  it('returns false for 10 digits', () => {
    expect(isDisplayId('0000113957')).toBe(false)
  })

  it('returns false for TIP-001', () => {
    expect(isDisplayId('TIP-001')).toBe(false)
  })

  it('returns false for alphanumeric strings', () => {
    expect(isDisplayId('00001139a')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// provisionLabel
// ---------------------------------------------------------------------------
describe('provisionLabel', () => {
  const VALID_IMEI = '864756085431395'
  const VALID_FIRMWARE = 'A011B27A7672M7'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockTransactionWithCounter(counter: number) {
    // Simulate a successful transaction: allocate counter, compute displayId, create row.
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const txMock = {
        label: {
          aggregate: vi.fn().mockResolvedValue({ _max: { counter: counter - 1 } }),
          create: vi.fn().mockImplementation(async ({ data, select }) => {
            return {
              id: 'new-label-id',
              deviceId: data.deviceId,
              displayId: data.displayId,
              imei: data.imei,
              counter: data.counter,
              firmwareVersion: data.firmwareVersion,
              createdAt: new Date('2026-04-08T12:00:00Z'),
              ...(select ? {} : {}),
            }
          }),
        },
      }
      return fn(txMock)
    })
  }

  it('throws INVALID_IMEI for a 14-digit IMEI (no DB call)', async () => {
    await expect(
      provisionLabel({ imei: '12345678901234' })
    ).rejects.toMatchObject({
      name: 'ProvisionLabelError',
      code: 'INVALID_IMEI',
    })
    expect(mockDb.label.findUnique).not.toHaveBeenCalled()
  })

  it('throws INVALID_IMEI for non-numeric IMEI', async () => {
    await expect(
      provisionLabel({ imei: 'ABCDEF012345678' })
    ).rejects.toMatchObject({
      code: 'INVALID_IMEI',
    })
    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('throws DUPLICATE_IMEI with existingLabel when IMEI already exists', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce({
      id: 'existing-id',
      displayId: '000011395',
      imei: VALID_IMEI,
    })

    try {
      await provisionLabel({ imei: VALID_IMEI })
      throw new Error('Expected provisionLabel to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionLabelError)
      const provisionErr = err as ProvisionLabelError
      expect(provisionErr.code).toBe('DUPLICATE_IMEI')
      expect(provisionErr.existingLabel).toEqual({
        id: 'existing-id',
        displayId: '000011395',
        imei: VALID_IMEI,
      })
    }

    expect(mockDb.$transaction).not.toHaveBeenCalled()
  })

  it('happy path: creates label with deviceId === displayId and all fields', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)
    mockTransactionWithCounter(1)

    const result = await provisionLabel({
      imei: VALID_IMEI,
      firmwareVersion: VALID_FIRMWARE,
    })

    expect(result).toEqual({
      id: 'new-label-id',
      deviceId: '000011395',
      displayId: '000011395',
      imei: VALID_IMEI,
      counter: 1,
      firmwareVersion: VALID_FIRMWARE,
      createdAt: new Date('2026-04-08T12:00:00Z'),
    })
  })

  it('happy path: works with counter 42', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)
    mockTransactionWithCounter(42)

    const result = await provisionLabel({
      imei: VALID_IMEI,
      firmwareVersion: VALID_FIRMWARE,
    })

    expect(result.counter).toBe(42)
    expect(result.displayId).toBe('000421395')
    expect(result.deviceId).toBe('000421395')
  })

  it('accepts null firmwareVersion', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)
    mockTransactionWithCounter(1)

    const result = await provisionLabel({ imei: VALID_IMEI })
    expect(result.firmwareVersion).toBeNull()
  })

  it('trims whitespace from IMEI', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)
    mockTransactionWithCounter(1)

    const result = await provisionLabel({
      imei: `  ${VALID_IMEI}  `,
      firmwareVersion: VALID_FIRMWARE,
    })

    expect(result.imei).toBe(VALID_IMEI)
  })

  it('retries on Prisma P2002 against counter key, succeeds on second attempt', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)

    let callCount = 0
    mockDb.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      callCount++
      if (callCount === 1) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['counter'] },
        })
      }
      // Second attempt succeeds
      const txMock = {
        label: {
          aggregate: vi.fn().mockResolvedValue({ _max: { counter: 5 } }),
          create: vi.fn().mockResolvedValue({
            id: 'retry-label-id',
            deviceId: '000061395',
            displayId: '000061395',
            imei: VALID_IMEI,
            counter: 6,
            firmwareVersion: VALID_FIRMWARE,
            createdAt: new Date('2026-04-08T12:00:00Z'),
          }),
        },
      }
      return fn(txMock)
    })

    const result = await provisionLabel({
      imei: VALID_IMEI,
      firmwareVersion: VALID_FIRMWARE,
    })

    expect(callCount).toBe(2)
    expect(result.id).toBe('retry-label-id')
    expect(result.counter).toBe(6)
  })

  it('translates P2002 on imei key into DUPLICATE_IMEI', async () => {
    mockDb.label.findUnique
      .mockResolvedValueOnce(null) // pre-check: no duplicate
      .mockResolvedValueOnce({
        id: 'race-id',
        displayId: '000011395',
        imei: VALID_IMEI,
      }) // post-P2002 lookup

    mockDb.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['imei'] },
      })
    )

    try {
      await provisionLabel({ imei: VALID_IMEI })
      throw new Error('Expected provisionLabel to throw')
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisionLabelError)
      const provisionErr = err as ProvisionLabelError
      expect(provisionErr.code).toBe('DUPLICATE_IMEI')
      expect(provisionErr.existingLabel?.id).toBe('race-id')
    }
  })

  it('throws after 3 retries on persistent counter conflicts', async () => {
    mockDb.label.findUnique.mockResolvedValueOnce(null)

    mockDb.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['counter'] },
      })
    )

    await expect(provisionLabel({ imei: VALID_IMEI })).rejects.toThrow(
      /Counter allocation failed/
    )
    expect(mockDb.$transaction).toHaveBeenCalledTimes(3)
  })
})
