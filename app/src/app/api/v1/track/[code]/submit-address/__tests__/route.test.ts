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

vi.mock('@/lib/notifications', () => ({
  sendDispatchDetailsSubmitted: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from '../route'
import { db } from '@/lib/db'
import { sendDispatchDetailsSubmitted } from '@/lib/notifications'

const mockDb = vi.mocked(db)
const mockSendNotification = vi.mocked(sendDispatchDetailsSubmitted)

const validBody = {
  firstName: 'Jane',
  lastName: 'Doe',
  line1: '123 Main St',
  city: 'Berlin',
  postalCode: '10115',
  country: 'DE',
  email: 'jane@example.com',
}

const FUTURE_EXPIRY = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
const PAST_EXPIRY = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)

const baseShipment = {
  id: 'ship-001',
  type: 'LABEL_DISPATCH' as const,
  status: 'PENDING' as const,
  shareEnabled: true,
  addressSubmittedAt: null,
  shareLinkExpiresAt: FUTURE_EXPIRY,
}

// Each test gets a unique IP so the in-memory rate-limiter doesn't bleed across tests.
let ipCounter = 0
function uniqueRequest(body: unknown) {
  ipCounter++
  return createTestRequest('/api/v1/track/ABC12345/submit-address', {
    method: 'POST',
    body,
    headers: { 'x-forwarded-for': `10.0.0.${ipCounter}` },
  })
}

const PARAMS = { params: Promise.resolve({ code: 'ABC12345' }) }

describe('POST /api/v1/track/[code]/submit-address', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when the body fails validation (missing first name)', async () => {
    const { firstName: _omit, ...rest } = validBody
    void _omit

    const res = await POST(uniqueRequest(rest), PARAMS)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(400)
    expect(body.error).toMatch(/Validation/i)
    expect(mockDb.shipment.findUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when the share code does not match a shipment', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(null as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(404)
    expect(body.error).toBe('Shipment not found')
  })

  it('returns 410 Gone when the share link has expired', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce({
      ...baseShipment,
      shareLinkExpiresAt: PAST_EXPIRY,
    } as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(410)
    expect(body.error).toMatch(/expired/i)
    expect(mockDb.shipment.update).not.toHaveBeenCalled()
  })

  it('returns 409 when the address has already been submitted (idempotency)', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce({
      ...baseShipment,
      addressSubmittedAt: new Date('2026-04-01T00:00:00Z'),
    } as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status, body } = await parseResponse<{ error: string }>(res)

    expect(status).toBe(409)
    expect(body.error).toMatch(/already been submitted/i)
    expect(mockDb.shipment.update).not.toHaveBeenCalled()
  })

  it('returns 400 when the shipment is not a LABEL_DISPATCH', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce({
      ...baseShipment,
      type: 'CARGO_TRACKING' as const,
    } as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status } = await parseResponse(res)

    expect(status).toBe(400)
  })

  it('returns 403 when sharing is disabled on the shipment', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce({
      ...baseShipment,
      shareEnabled: false,
    } as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status } = await parseResponse(res)

    expect(status).toBe(403)
  })

  it('writes first/last name + concatenated destinationName, sets addressSubmittedAt, and fires notification', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(baseShipment as never)
    mockDb.shipment.update.mockResolvedValueOnce({} as never)

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status, body } = await parseResponse<{ success: boolean }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)

    expect(mockDb.shipment.update).toHaveBeenCalledTimes(1)
    const updateCall = mockDb.shipment.update.mock.calls[0][0] as {
      where: { id: string }
      data: Record<string, unknown>
    }
    expect(updateCall.where).toEqual({ id: 'ship-001' })
    expect(updateCall.data).toMatchObject({
      receiverFirstName: 'Jane',
      receiverLastName: 'Doe',
      destinationName: 'Jane Doe',
      destinationLine1: '123 Main St',
      destinationCity: 'Berlin',
      destinationPostalCode: '10115',
      destinationCountry: 'DE',
      consigneeEmail: 'jane@example.com',
      consigneePhone: null,
    })
    expect(updateCall.data.addressSubmittedAt).toBeInstanceOf(Date)
    // The legacy single-line destinationAddress should include the receiver's full name
    expect(String(updateCall.data.destinationAddress)).toContain('Jane Doe')
    expect(String(updateCall.data.destinationAddress)).toContain('Berlin')

    // Notification fires fire-and-forget but should be invoked synchronously
    expect(mockSendNotification).toHaveBeenCalledWith({ shipmentId: 'ship-001' })
  })

  it('still returns success even if the buyer notification fails', async () => {
    mockDb.shipment.findUnique.mockResolvedValueOnce(baseShipment as never)
    mockDb.shipment.update.mockResolvedValueOnce({} as never)
    mockSendNotification.mockRejectedValueOnce(new Error('Resend down'))

    const res = await POST(uniqueRequest(validBody), PARAMS)
    const { status, body } = await parseResponse<{ success: boolean }>(res)

    expect(status).toBe(200)
    expect(body.success).toBe(true)
  })
})
