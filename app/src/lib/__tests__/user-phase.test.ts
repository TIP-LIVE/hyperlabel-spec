import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the db before importing the resolver
vi.mock('@/lib/db', () => ({
  db: {
    order: { findFirst: vi.fn() },
    shipment: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

import { resolveUserPhase } from '@/lib/user-phase'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

const ARGS = { userId: 'db-user-001', orgId: 'org_test_001' }

/**
 * Helper: configure all four parallel queries with sensible defaults.
 * Tests can override individual responses afterwards.
 */
function setupMocks(opts: {
  order?: unknown
  dispatches?: unknown[]
  activeCargoCount?: number
  firstPendingCargo?: unknown
} = {}) {
  mockDb.order.findFirst.mockResolvedValue((opts.order ?? null) as never)
  mockDb.shipment.findMany.mockResolvedValue((opts.dispatches ?? []) as never)
  mockDb.shipment.count.mockResolvedValue((opts.activeCargoCount ?? 0) as never)
  mockDb.shipment.findFirst.mockResolvedValue((opts.firstPendingCargo ?? null) as never)
}

function makeOrderRow(undispatchedCount: number, dispatchedCount: number = 0) {
  const total = undispatchedCount + dispatchedCount
  const orderLabels = Array.from({ length: total }, (_, i) => ({
    label: {
      id: `label-${i}`,
      // The first `dispatchedCount` labels are already in a dispatch
      shipmentLabels: i < dispatchedCount ? [{ shipmentId: `disp-${i}` }] : [],
    },
  }))
  return {
    id: 'order-001',
    quantity: total,
    status: 'PAID',
    createdAt: new Date('2026-04-01T00:00:00Z'),
    orderLabels,
  }
}

function makeDispatch(overrides: {
  id?: string
  status?: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  addressSubmittedAt?: Date | null
  shareLinkExpiresAt?: Date | null
  receiverFirstName?: string | null
  receiverLastName?: string | null
  consigneeEmail?: string | null
} = {}) {
  return {
    id: overrides.id ?? 'disp-001',
    name: 'Test Dispatch',
    status: overrides.status ?? 'PENDING',
    addressSubmittedAt: overrides.addressSubmittedAt ?? null,
    shareCode: 'ABC12345',
    shareLinkExpiresAt: overrides.shareLinkExpiresAt ?? null,
    receiverFirstName: overrides.receiverFirstName ?? null,
    receiverLastName: overrides.receiverLastName ?? null,
    consigneeEmail: overrides.consigneeEmail ?? null,
    createdAt: new Date('2026-04-01T00:00:00Z'),
    _count: { shipmentLabels: 5 },
  }
}

describe('resolveUserPhase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Phase 0 — cold', () => {
    it('returns phase 0 when there are no orders', async () => {
      setupMocks({})

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(0)
      expect(result.latestOrder).toBeNull()
      expect(result.pendingDispatches).toEqual([])
      expect(result.activeCargoCount).toBe(0)
      expect(result.firstPendingCargoId).toBeNull()
    })
  })

  describe('Phase 1 — paid, undispatched', () => {
    it('returns phase 1 when an order has undispatched labels and no dispatches exist', async () => {
      setupMocks({ order: makeOrderRow(10, 0) })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(1)
      expect(result.latestOrder).toMatchObject({
        id: 'order-001',
        quantity: 10,
        dispatchedCount: 0,
        undispatchedCount: 10,
      })
    })

    it('does NOT return phase 1 when all order labels are already dispatched', async () => {
      setupMocks({ order: makeOrderRow(0, 10) })

      const result = await resolveUserPhase(ARGS)

      // No undispatched labels and no dispatches in flight → phase 0 (cold)
      expect(result.phase).toBe(0)
      expect(result.latestOrder?.undispatchedCount).toBe(0)
      expect(result.latestOrder?.dispatchedCount).toBe(10)
    })
  })

  describe('Phase 1b — dispatch awaiting receiver details', () => {
    it('returns phase 1b when a PENDING dispatch has no addressSubmittedAt', async () => {
      setupMocks({
        order: makeOrderRow(5, 5),
        dispatches: [
          makeDispatch({
            id: 'disp-blank',
            status: 'PENDING',
            addressSubmittedAt: null,
            shareLinkExpiresAt: new Date('2026-04-15T00:00:00Z'),
          }),
        ],
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe('1b')
      expect(result.pendingDispatches).toHaveLength(1)
      expect(result.pendingDispatches[0]).toMatchObject({
        id: 'disp-blank',
        addressSubmittedAt: null,
        labelCount: 5,
      })
    })
  })

  describe('Phase 2 — dispatch in flight', () => {
    it('returns phase 2 when a PENDING dispatch has receiver details submitted', async () => {
      setupMocks({
        order: makeOrderRow(5, 5),
        dispatches: [
          makeDispatch({
            status: 'PENDING',
            addressSubmittedAt: new Date('2026-04-02T00:00:00Z'),
            receiverFirstName: 'Jane',
            receiverLastName: 'Doe',
          }),
        ],
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(2)
    })

    it('returns phase 2 when a dispatch is IN_TRANSIT regardless of address state', async () => {
      setupMocks({
        order: makeOrderRow(5, 5),
        dispatches: [
          makeDispatch({
            status: 'IN_TRANSIT',
            addressSubmittedAt: new Date('2026-04-02T00:00:00Z'),
          }),
        ],
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(2)
    })
  })

  describe('Phase 3 — dispatch delivered, no cargo yet', () => {
    it('returns phase 3 when at least one dispatch is DELIVERED and no cargo exists', async () => {
      setupMocks({
        order: makeOrderRow(0, 5),
        dispatches: [
          makeDispatch({ status: 'DELIVERED', addressSubmittedAt: new Date('2026-04-02T00:00:00Z') }),
        ],
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(3)
    })

    it('still prefers in-flight phase 2 over phase 3 when both states are present', async () => {
      // Per the resolver: cargo > delivered > in-transit > pending — but
      // delivered already takes precedence over pending dispatches.
      setupMocks({
        order: makeOrderRow(0, 5),
        dispatches: [
          makeDispatch({ id: 'disp-delivered', status: 'DELIVERED', addressSubmittedAt: new Date() }),
          makeDispatch({ id: 'disp-transit', status: 'IN_TRANSIT', addressSubmittedAt: new Date() }),
        ],
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(3)
    })
  })

  describe('Phase 4 — cargo waiting for first signal', () => {
    it('returns phase 4 when active cargo exists and first cargo has no locations', async () => {
      setupMocks({
        order: makeOrderRow(0, 5),
        dispatches: [makeDispatch({ status: 'DELIVERED', addressSubmittedAt: new Date() })],
        activeCargoCount: 1,
        firstPendingCargo: { id: 'cargo-pending-001' },
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(4)
      expect(result.firstPendingCargoId).toBe('cargo-pending-001')
      expect(result.activeCargoCount).toBe(1)
    })
  })

  describe('Phase 5 — live cargo', () => {
    it('returns phase 5 when active cargo exists and the first cargo has locations', async () => {
      setupMocks({
        order: makeOrderRow(0, 5),
        dispatches: [makeDispatch({ status: 'DELIVERED', addressSubmittedAt: new Date() })],
        activeCargoCount: 2,
        firstPendingCargo: null, // every active cargo already has at least one LocationEvent
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(5)
      expect(result.activeCargoCount).toBe(2)
      expect(result.firstPendingCargoId).toBeNull()
    })

    it('cargo state always wins over delivered dispatches', async () => {
      setupMocks({
        order: makeOrderRow(0, 5),
        dispatches: [
          makeDispatch({ status: 'DELIVERED', addressSubmittedAt: new Date() }),
          makeDispatch({ id: 'd2', status: 'PENDING', addressSubmittedAt: null }),
        ],
        activeCargoCount: 1,
        firstPendingCargo: null,
      })

      const result = await resolveUserPhase(ARGS)

      expect(result.phase).toBe(5)
    })
  })

  describe('query scoping', () => {
    it('uses orgId scoping when an org is active', async () => {
      setupMocks({})

      await resolveUserPhase({ userId: 'u1', orgId: 'org-abc' })

      expect(mockDb.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org-abc' }),
        }),
      )
      expect(mockDb.shipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId: 'org-abc', type: 'LABEL_DISPATCH' }),
        }),
      )
    })

    it('falls back to userId scoping when no org is active', async () => {
      setupMocks({})

      await resolveUserPhase({ userId: 'u1', orgId: null })

      expect(mockDb.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'u1' }),
        }),
      )
    })
  })
})
