import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

vi.mock('@/lib/db', () => ({
  db: {
    shipment: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

import { POST } from '../[code]/unsubscribe/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/track/[code]/unsubscribe', () => {
  const makeParams = (code: string) => ({
    params: Promise.resolve({ code }),
  })

  it('returns 400 when email param is missing', async () => {
    const req = createTestRequest('/api/v1/track/abc123/unsubscribe', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Email parameter required')
  })

  it('returns 404 when shipment not found', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/track/nonexistent/unsubscribe?email=test@example.com', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('nonexistent'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect((body as { error: string }).error).toBe('Shipment not found')
  })

  it('returns 403 when email does not match consignee', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      id: 'ship-001',
      consigneeEmail: 'real@example.com',
    } as never)

    const req = createTestRequest('/api/v1/track/abc123/unsubscribe?email=wrong@example.com', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect((body as { error: string }).error).toBe('Email does not match')
  })

  it('returns 403 when shipment has no consignee email', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      id: 'ship-001',
      consigneeEmail: null,
    } as never)

    const req = createTestRequest('/api/v1/track/abc123/unsubscribe?email=test@example.com', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(403)
    expect((body as { error: string }).error).toBe('Email does not match')
  })

  it('succeeds with case-insensitive email match', async () => {
    mockedDb.shipment.findUnique.mockResolvedValue({
      id: 'ship-001',
      consigneeEmail: 'Test@Example.COM',
    } as never)
    mockedDb.shipment.update.mockResolvedValue({} as never)

    const req = createTestRequest('/api/v1/track/abc123/unsubscribe?email=test@example.com', {
      method: 'POST',
    })
    const res = await POST(req, makeParams('abc123'))
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    expect((body as { success: boolean }).success).toBe(true)
    expect(mockedDb.shipment.update).toHaveBeenCalledWith({
      where: { id: 'ship-001' },
      data: { consigneeUnsubscribed: true },
    })
  })
})
