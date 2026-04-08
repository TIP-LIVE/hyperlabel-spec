import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { mockAuthenticatedUser } from '@/test/helpers/auth-mock'

vi.mock('@/lib/db', () => {
  const mockDb = {
    user: { findUnique: vi.fn() },
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  }
  return { db: mockDb }
})

vi.mock('@/lib/notifications', () => ({
  sendConsigneeInTransitNotification: vi.fn().mockResolvedValue(undefined),
  sendConsigneeDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchInTransitNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchDeliveredNotification: vi.fn().mockResolvedValue(undefined),
  sendDispatchCancelledNotification: vi.fn().mockResolvedValue(undefined),
}))

import { PATCH, DELETE } from '../route'
import { db } from '@/lib/db'
import {
  sendDispatchInTransitNotification,
  sendDispatchDeliveredNotification,
  sendDispatchCancelledNotification,
  sendConsigneeInTransitNotification,
  sendConsigneeDeliveredNotification,
} from '@/lib/notifications'

const mockDb = vi.mocked(db)
const mockInTransit = vi.mocked(sendDispatchInTransitNotification)
const mockDelivered = vi.mocked(sendDispatchDeliveredNotification)
const mockCancelled = vi.mocked(sendDispatchCancelledNotification)
const mockConsigneeInTransit = vi.mocked(sendConsigneeInTransitNotification)
const mockConsigneeDelivered = vi.mocked(sendConsigneeDeliveredNotification)

const adminDbUser = {
  id: 'db-admin-001',
  clerkId: 'clerk_test_user_001',
  email: 'admin@tip.live',
  firstName: 'Admin',
  lastName: 'User',
  imageUrl: null,
  role: 'admin' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function buildShipment(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'shipment-001',
    type: 'LABEL_DISPATCH',
    status: 'PENDING',
    userId: 'db-admin-001',
    orgId: 'org_test_001',
    name: 'Spring Drop',
    shareCode: 'ABC123',
    originAddress: null,
    destinationAddress: '123 Main St, Berlin, DE',
    consigneeEmail: 'jane@example.com',
    addressSubmittedAt: new Date(),
    ...overrides,
  }
}

function patchRequest(body: Record<string, unknown>) {
  return createTestRequest('/api/v1/dispatch/shipment-001', {
    method: 'PATCH',
    body,
  })
}

const routeParams = { params: Promise.resolve({ id: 'shipment-001' }) }

describe('PATCH /api/v1/dispatch/[id] — owner notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValue(adminDbUser as never)
    mockDb.shipment.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) =>
        ({ id: 'shipment-001', ...data }) as never
    )
  })

  it('notifies the dispatch owner when transitioning PENDING → IN_TRANSIT', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'PENDING' }) as never)

    const res = await PATCH(patchRequest({ status: 'IN_TRANSIT' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockInTransit).toHaveBeenCalledTimes(1)
    expect(mockInTransit).toHaveBeenCalledWith({ shipmentId: 'shipment-001' })
    // Consignee email still fires when consigneeEmail is set
    expect(mockConsigneeInTransit).toHaveBeenCalledTimes(1)
  })

  it('notifies the dispatch owner on IN_TRANSIT even when consigneeEmail is null', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(
      buildShipment({ status: 'PENDING', consigneeEmail: null }) as never
    )

    const res = await PATCH(patchRequest({ status: 'IN_TRANSIT' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockInTransit).toHaveBeenCalledTimes(1)
    expect(mockConsigneeInTransit).not.toHaveBeenCalled()
  })

  it('notifies the dispatch owner when transitioning IN_TRANSIT → DELIVERED', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'IN_TRANSIT' }) as never)

    const res = await PATCH(patchRequest({ status: 'DELIVERED' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockDelivered).toHaveBeenCalledTimes(1)
    expect(mockDelivered).toHaveBeenCalledWith({ shipmentId: 'shipment-001' })
    expect(mockConsigneeDelivered).toHaveBeenCalledTimes(1)
  })

  it('notifies the dispatch owner when transitioning PENDING → CANCELLED', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'PENDING' }) as never)

    const res = await PATCH(patchRequest({ status: 'CANCELLED' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockCancelled).toHaveBeenCalledTimes(1)
    expect(mockCancelled).toHaveBeenCalledWith({ shipmentId: 'shipment-001' })
  })

  it('notifies the dispatch owner when transitioning IN_TRANSIT → CANCELLED', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'IN_TRANSIT' }) as never)

    const res = await PATCH(patchRequest({ status: 'CANCELLED' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockCancelled).toHaveBeenCalledTimes(1)
  })

  it('does not notify on PENDING → PENDING non-status edits', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'PENDING' }) as never)

    const res = await PATCH(patchRequest({ name: 'Renamed Drop' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockInTransit).not.toHaveBeenCalled()
    expect(mockDelivered).not.toHaveBeenCalled()
    expect(mockCancelled).not.toHaveBeenCalled()
  })

  it('rejects non-admin users attempting a status change', async () => {
    mockDb.user.findUnique.mockResolvedValueOnce({ ...adminDbUser, role: 'user' } as never)
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'PENDING' }) as never)

    const res = await PATCH(patchRequest({ status: 'IN_TRANSIT' }), routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(403)
    expect(mockInTransit).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/v1/dispatch/[id] — owner notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValue(adminDbUser as never)
    mockDb.shipment.update.mockResolvedValue({ id: 'shipment-001' } as never)
  })

  it('notifies the dispatch owner on DELETE', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'PENDING' }) as never)

    const req = createTestRequest('/api/v1/dispatch/shipment-001', { method: 'DELETE' })
    const res = await DELETE(req, routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockCancelled).toHaveBeenCalledTimes(1)
    expect(mockCancelled).toHaveBeenCalledWith({ shipmentId: 'shipment-001' })
  })

  it('does not notify when DELETE is rejected (already delivered)', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(buildShipment({ status: 'DELIVERED' }) as never)

    const req = createTestRequest('/api/v1/dispatch/shipment-001', { method: 'DELETE' })
    const res = await DELETE(req, routeParams)
    const { status } = await parseResponse(res)

    expect(status).toBe(400)
    expect(mockCancelled).not.toHaveBeenCalled()
  })
})
