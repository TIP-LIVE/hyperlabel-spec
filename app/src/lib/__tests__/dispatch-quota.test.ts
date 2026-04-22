import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    order: { aggregate: vi.fn() },
    shipment: { findMany: vi.fn() },
  },
}))

import { countActivelyDispatched, getDispatchQuota } from '@/lib/dispatch-quota'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

type ActiveRow = {
  labelCount: number | null
  _count: { shipmentLabels: number }
}

function withActive(rows: ActiveRow[]) {
  mockDb.shipment.findMany.mockResolvedValue(rows as never)
}

function withPurchased(qty: number) {
  mockDb.order.aggregate.mockResolvedValue({ _sum: { quantity: qty } } as never)
}

describe('countActivelyDispatched', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sums shipmentLabels count for user-created dispatches', async () => {
    withActive([
      { labelCount: null, _count: { shipmentLabels: 1 } },
      { labelCount: null, _count: { shipmentLabels: 2 } },
    ])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(3)
  })

  it('counts blank admin dispatches (labelCount set, shipmentLabels empty)', async () => {
    withActive([
      { labelCount: 2, _count: { shipmentLabels: 0 } },
    ])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(2)
  })

  it('takes max(labelCount, shipmentLabels) per dispatch — reservation vs. scans', async () => {
    // Admin reserved 3, but admin scanned 2 so far — reservation is still 3
    withActive([
      { labelCount: 3, _count: { shipmentLabels: 2 } },
    ])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(3)
  })

  it('takes max when scans exceed reservation (over-scan edge case)', async () => {
    withActive([
      { labelCount: 1, _count: { shipmentLabels: 2 } },
    ])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(2)
  })

  it('combines all three dispatch shapes in the same org', async () => {
    withActive([
      { labelCount: null, _count: { shipmentLabels: 1 } }, // user-created
      { labelCount: 2, _count: { shipmentLabels: 0 } },    // admin blank
      { labelCount: 1, _count: { shipmentLabels: 1 } },    // admin scanned
    ])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(4)
  })

  it('returns 0 when no active dispatches', async () => {
    withActive([])
    expect(await countActivelyDispatched(db, { orgId: 'org_1' })).toBe(0)
  })
})

describe('getDispatchQuota — Andrii regression', () => {
  beforeEach(() => vi.clearAllMocks())

  // This reproduces the exact scenario Andrii hit on 2026-04-22.
  // Before the fix, the warehouse banner counted only shipmentLabel rows,
  // missing the admin's blank reservation and showing "1 label ready" even
  // though the label was already committed. Result: user could double-book.
  it('blocks user dispatch when admin blank reservation covers all purchased labels', async () => {
    withPurchased(1)
    withActive([
      { labelCount: 1, _count: { shipmentLabels: 0 } }, // admin-created blank
    ])
    const quota = await getDispatchQuota(db, { orgId: 'org_utc' })
    expect(quota).toEqual({
      totalBought: 1,
      activelyDispatched: 1,
      remaining: 0,
    })
  })

  it('clamps remaining at 0 if reservations exceed purchases', async () => {
    withPurchased(1)
    withActive([
      { labelCount: 2, _count: { shipmentLabels: 0 } },
    ])
    const quota = await getDispatchQuota(db, { orgId: 'org_1' })
    expect(quota.remaining).toBe(0)
  })

  it('excludes the current dispatch when verify-labels passes excludeShipmentId', async () => {
    // Admin scanning into dispatch "d1" — its own reservation should not
    // count against itself, or scan would never pass.
    withActive([
      { labelCount: 1, _count: { shipmentLabels: 0 } }, // another dispatch
    ])
    withPurchased(2)
    const quota = await getDispatchQuota(db, { orgId: 'org_1' }, 'd1')
    expect(mockDb.shipment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: 'd1' } }),
      }),
    )
    expect(quota.remaining).toBe(1)
  })
})
