import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    cronExecutionLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { GET } from '../check-stale-dispatches/route'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cron/check-stale-dispatches', () => {
  it('returns 401 without a valid CRON_SECRET', async () => {
    const req = createTestRequest('/api/cron/check-stale-dispatches')
    const res = await GET(req)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(401)
    expect(body.error).toBe('Unauthorized')
    expect(mockDb.shipment.findMany).not.toHaveBeenCalled()
  })

  it('returns 0/0 counts when there are no stale dispatches at all', async () => {
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never) // day-7 query
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never) // expired query

    const req = createTestRequest('/api/cron/check-stale-dispatches', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse<{
      success: boolean
      remindersLogged: number
      cancelled: number
      scanned: number
    }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.remindersLogged).toBe(0)
    expect(body.cancelled).toBe(0)
    expect(body.scanned).toBe(0)
    expect(mockDb.shipment.update).not.toHaveBeenCalled()
  })

  it('counts day-7 reminders without modifying the dispatches', async () => {
    mockDb.shipment.findMany.mockResolvedValueOnce([
      { id: 'd1', name: 'Old Dispatch 1', shareCode: 'CODE1', userId: 'u1' },
      { id: 'd2', name: 'Old Dispatch 2', shareCode: 'CODE2', userId: 'u1' },
    ] as never)
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never)

    const req = createTestRequest('/api/cron/check-stale-dispatches', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse<{
      remindersLogged: number
      cancelled: number
      scanned: number
    }>(res)

    expect(status).toBe(200)
    expect(body.remindersLogged).toBe(2)
    expect(body.cancelled).toBe(0)
    expect(body.scanned).toBe(2)
    expect(mockDb.shipment.update).not.toHaveBeenCalled()
  })

  it('cancels expired dispatches by setting status to CANCELLED', async () => {
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never)
    mockDb.shipment.findMany.mockResolvedValueOnce([
      { id: 'expired-1', name: 'Forgotten dispatch' },
      { id: 'expired-2', name: 'Another forgotten one' },
    ] as never)
    mockDb.shipment.update.mockResolvedValue({} as never)

    const req = createTestRequest('/api/cron/check-stale-dispatches', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse<{
      remindersLogged: number
      cancelled: number
      scanned: number
    }>(res)

    expect(status).toBe(200)
    expect(body.remindersLogged).toBe(0)
    expect(body.cancelled).toBe(2)
    expect(body.scanned).toBe(2)

    expect(mockDb.shipment.update).toHaveBeenCalledTimes(2)
    expect(mockDb.shipment.update).toHaveBeenCalledWith({
      where: { id: 'expired-1' },
      data: { status: 'CANCELLED' },
    })
    expect(mockDb.shipment.update).toHaveBeenCalledWith({
      where: { id: 'expired-2' },
      data: { status: 'CANCELLED' },
    })
  })

  it('handles a mixed batch (some reminders + some cancellations) in one run', async () => {
    mockDb.shipment.findMany.mockResolvedValueOnce([
      { id: 'd1', name: 'Day-7 reminder', shareCode: 'C1', userId: 'u1' },
    ] as never)
    mockDb.shipment.findMany.mockResolvedValueOnce([
      { id: 'expired-1', name: 'Expired' },
    ] as never)
    mockDb.shipment.update.mockResolvedValue({} as never)

    const req = createTestRequest('/api/cron/check-stale-dispatches', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse<{
      remindersLogged: number
      cancelled: number
      scanned: number
    }>(res)

    expect(status).toBe(200)
    expect(body.remindersLogged).toBe(1)
    expect(body.cancelled).toBe(1)
    expect(body.scanned).toBe(2)
    expect(mockDb.shipment.update).toHaveBeenCalledTimes(1)
  })

  it('queries with the right window for day-7 reminders (between 8 and 7 days ago)', async () => {
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never)
    mockDb.shipment.findMany.mockResolvedValueOnce([] as never)

    const req = createTestRequest('/api/cron/check-stale-dispatches', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    await GET(req)

    const reminderCall = mockDb.shipment.findMany.mock.calls[0][0] as {
      where: {
        type: string
        status: string
        addressSubmittedAt: null
        shareLinkExpiresAt: { not: null }
        createdAt: { gte: Date; lte: Date }
      }
    }

    expect(reminderCall.where.type).toBe('LABEL_DISPATCH')
    expect(reminderCall.where.status).toBe('PENDING')
    expect(reminderCall.where.addressSubmittedAt).toBeNull()
    expect(reminderCall.where.createdAt.gte).toBeInstanceOf(Date)
    expect(reminderCall.where.createdAt.lte).toBeInstanceOf(Date)

    // gte should be ~8 days ago, lte should be ~7 days ago — gte must be earlier
    expect(reminderCall.where.createdAt.gte.getTime()).toBeLessThan(
      reminderCall.where.createdAt.lte.getTime(),
    )
    const windowMs =
      reminderCall.where.createdAt.lte.getTime() - reminderCall.where.createdAt.gte.getTime()
    expect(windowMs).toBeCloseTo(24 * 60 * 60 * 1000, -2) // ~1 day window
  })
})
