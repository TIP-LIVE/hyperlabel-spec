import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    notification: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    shipment: {
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    locationEvent: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    order: { deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
    label: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    user: { delete: vi.fn().mockResolvedValue({}) },
  },
}))

import { DELETE } from '../delete/route'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

const mockedGetCurrentUser = vi.mocked(getCurrentUser)
const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DELETE /api/v1/user/delete', () => {
  it('returns 401 when not authenticated', async () => {
    mockedGetCurrentUser.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'DELETE' },
    })
    const res = await DELETE(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns 400 when confirmation is missing', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: {},
    })
    const res = await DELETE(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toContain('Confirmation required')
  })

  it('returns 400 when confirmation value is wrong', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'WRONG' },
    })
    const res = await DELETE(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(400)
  })

  it('deletes all user data in correct order on success', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)
    mockedDb.shipment.findMany.mockResolvedValue([
      { id: 'ship-001' },
      { id: 'ship-002' },
    ] as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'DELETE' },
    })
    const res = await DELETE(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)

    // Verify deletion order
    expect(mockedDb.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-001' },
    })
    expect(mockedDb.locationEvent.deleteMany).toHaveBeenCalledWith({
      where: { shipmentId: { in: ['ship-001', 'ship-002'] } },
    })
    expect(mockedDb.shipment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-001' },
    })
    expect(mockedDb.order.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-001' },
    })
    expect(mockedDb.user.delete).toHaveBeenCalledWith({
      where: { id: 'user-001' },
    })
  })

  it('skips location event deletion when user has no shipments', async () => {
    mockedGetCurrentUser.mockResolvedValue({ id: 'user-001', email: 'test@tip.live' } as never)
    mockedDb.shipment.findMany.mockResolvedValue([] as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'DELETE' },
    })
    const res = await DELETE(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    expect(mockedDb.locationEvent.deleteMany).not.toHaveBeenCalled()
  })
})
