import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import {
  mockAuthenticatedUser,
  mockUnauthenticated,
} from '@/test/helpers/auth-mock'
import { validSavedAddress } from '@/test/helpers/fixtures'

// Mock database
vi.mock('@/lib/db', () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    savedAddress: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
  }
  return { db: mockDb }
})

import { GET, POST } from '../route'
import { db } from '@/lib/db'

const mockDb = vi.mocked(db)

// Fake user record as returned from DB
const fakeDbUser = {
  id: 'db-user-001',
  clerkId: 'clerk_test_user_001',
  email: 'test@tip.live',
  firstName: 'Test',
  lastName: 'User',
  imageUrl: null,
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/addresses')
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns addresses list on success', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const fakeAddresses = [
      {
        id: 'addr-001',
        label: 'Office',
        name: 'John Doe',
        line1: '123 Test Street',
        line2: null,
        city: 'London',
        state: null,
        postalCode: 'SW1A 1AA',
        country: 'GB',
        isDefault: true,
        userId: 'db-user-001',
        orgId: 'org_test_001',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]
    mockDb.savedAddress.findMany.mockResolvedValueOnce(fakeAddresses as never)

    const req = createTestRequest('/api/v1/addresses')
    const res = await GET(req)
    const { status, body } = await parseResponse<{ addresses: unknown[] }>(res)

    expect(status).toBe(200)
    expect(body.addresses).toHaveLength(1)
    expect(body.addresses[0]).toMatchObject({
      id: 'addr-001',
      label: 'Office',
      city: 'London',
    })
  })

  it('supports search with ?q= parameter', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)
    mockDb.savedAddress.findMany.mockResolvedValueOnce([] as never)

    const req = createTestRequest('/api/v1/addresses?q=london')
    const res = await GET(req)
    const { status } = await parseResponse(res)

    expect(status).toBe(200)
    // Verify findMany was called with OR filter for the search term
    expect(mockDb.savedAddress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ city: { contains: 'london', mode: 'insensitive' } }),
          ]),
        }),
      })
    )
  })
})

describe('POST /api/v1/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()

    const req = createTestRequest('/api/v1/addresses', {
      method: 'POST',
      body: validSavedAddress(),
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 400 for invalid body (missing required fields)', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const req = createTestRequest('/api/v1/addresses', {
      method: 'POST',
      body: { label: 'Office' }, // missing name, line1, city, postalCode, country
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  it('returns 400 for invalid country code', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const req = createTestRequest('/api/v1/addresses', {
      method: 'POST',
      body: validSavedAddress({ country: 'INVALID' }), // must be exactly 2 chars
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect(body).toHaveProperty('error', 'Validation failed')
  })

  it('returns 201 with created address on success', async () => {
    mockAuthenticatedUser()
    mockDb.user.findUnique.mockResolvedValueOnce(fakeDbUser as never)

    const addressData = validSavedAddress()
    const createdAddress = {
      id: 'addr-new',
      ...addressData,
      line2: null,
      state: null,
      isDefault: false,
      userId: 'db-user-001',
      orgId: 'org_test_001',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockDb.savedAddress.create.mockResolvedValueOnce(createdAddress as never)

    const req = createTestRequest('/api/v1/addresses', {
      method: 'POST',
      body: addressData,
    })

    const res = await POST(req)
    const { status, body } = await parseResponse<{ address: { id: string; label: string } }>(res)

    expect(status).toBe(201)
    expect(body.address).toMatchObject({
      id: 'addr-new',
      label: 'Office',
      name: 'John Doe',
      city: 'London',
      country: 'GB',
    })
  })
})
