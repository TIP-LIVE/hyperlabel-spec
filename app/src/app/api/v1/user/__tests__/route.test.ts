import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'
import { mockAuthenticatedUser, mockUnauthenticated } from '@/test/helpers/auth-mock'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    notification: {
      deleteMany: vi.fn(),
    },
    shipment: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    locationEvent: {
      deleteMany: vi.fn(),
    },
    order: {
      deleteMany: vi.fn(),
    },
    label: {
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/admin-whitelist', () => ({
  isAdminEmail: vi.fn().mockReturnValue(false),
}))

import { GET as getUserProfile } from '../route'
import { GET as getPreferences, PATCH as patchPreferences } from '../preferences/route'
import { DELETE as deleteUser } from '../delete/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/v1/user
// ---------------------------------------------------------------------------
describe('GET /api/v1/user', () => {
  const mockDbUser = {
    id: 'db-user-001',
    clerkId: 'clerk_test_user_001',
    email: 'test@tip.live',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
    role: 'user',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date(),
    notifyLabelActivated: true,
    notifyLowBattery: true,
    notifyNoSignal: true,
    notifyDelivered: true,
    notifyOrderShipped: true,
  }

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()
    mockedDb.user.findUnique.mockResolvedValue(null as never)

    const res = await getUserProfile()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns user profile on success', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)

    const res = await getUserProfile()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as {
      id: string
      email: string
      firstName: string
      lastName: string
      role: string
      orgId: string | null
    }
    expect(typedBody.id).toBe('db-user-001')
    expect(typedBody.email).toBe('test@tip.live')
    expect(typedBody.firstName).toBe('Test')
    expect(typedBody.lastName).toBe('User')
    expect(typedBody.role).toBe('user')
    expect(typedBody.orgId).toBe('org_test_001')
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/user/preferences
// ---------------------------------------------------------------------------
describe('GET /api/v1/user/preferences', () => {
  const mockPrefs = {
    notifyLabelActivated: true,
    notifyLowBattery: true,
    notifyNoSignal: false,
    notifyDelivered: true,
    notifyOrderShipped: true,
  }

  it('returns preferences on success', async () => {
    mockAuthenticatedUser()
    // First findUnique call for requireAuth -> getCurrentUser
    mockedDb.user.findUnique
      .mockResolvedValueOnce({
        id: 'db-user-001',
        clerkId: 'clerk_test_user_001',
        email: 'test@tip.live',
        firstName: 'Test',
        lastName: 'User',
        imageUrl: null,
        role: 'user',
      } as never)
      // Second findUnique call for the preferences query
      .mockResolvedValueOnce(mockPrefs as never)

    const res = await getPreferences()
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { preferences: typeof mockPrefs }
    expect(typedBody.preferences).toEqual(mockPrefs)
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/user/preferences
// ---------------------------------------------------------------------------
describe('PATCH /api/v1/user/preferences', () => {
  const mockDbUser = {
    id: 'db-user-001',
    clerkId: 'clerk_test_user_001',
    email: 'test@tip.live',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
    role: 'user',
  }

  it('updates individual preference', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValueOnce(mockDbUser as never)
    mockedDb.user.update.mockResolvedValue({
      notifyLabelActivated: true,
      notifyLowBattery: false,
      notifyNoSignal: true,
      notifyDelivered: true,
      notifyOrderShipped: true,
    } as never)

    const req = createTestRequest('/api/v1/user/preferences', {
      method: 'PATCH',
      body: { notifyLowBattery: false },
    })
    const res = await patchPreferences(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { preferences: { notifyLowBattery: boolean } }
    expect(typedBody.preferences.notifyLowBattery).toBe(false)
  })

  it('returns 400 for invalid body', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValueOnce(mockDbUser as never)

    const req = createTestRequest('/api/v1/user/preferences', {
      method: 'PATCH',
      body: { notifyLowBattery: 'not-a-boolean' },
    })
    const res = await patchPreferences(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toBe('Validation failed')
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/user/delete
// ---------------------------------------------------------------------------
describe('DELETE /api/v1/user/delete', () => {
  const mockDbUser = {
    id: 'db-user-001',
    clerkId: 'clerk_test_user_001',
    email: 'test@tip.live',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: null,
    role: 'user',
  }

  it('returns 401 when unauthenticated', async () => {
    mockUnauthenticated()
    mockedDb.user.findUnique.mockResolvedValue(null as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'DELETE' },
    })
    const res = await deleteUser(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns 400 when confirm is not "DELETE"', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'yes' },
    })
    const res = await deleteUser(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(400)
    expect((body as { error: string }).error).toContain('Confirmation required')
  })

  it('deletes user data on success', async () => {
    mockAuthenticatedUser()
    mockedDb.user.findUnique.mockResolvedValue(mockDbUser as never)
    mockedDb.notification.deleteMany.mockResolvedValue({ count: 0 } as never)
    mockedDb.shipment.findMany.mockResolvedValue([] as never)
    mockedDb.shipment.deleteMany.mockResolvedValue({ count: 0 } as never)
    mockedDb.order.deleteMany.mockResolvedValue({ count: 0 } as never)
    mockedDb.label.updateMany.mockResolvedValue({ count: 0 } as never)
    mockedDb.user.delete.mockResolvedValue(mockDbUser as never)

    const req = createTestRequest('/api/v1/user/delete', {
      method: 'DELETE',
      body: { confirm: 'DELETE' },
    })
    const res = await deleteUser(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; message: string }
    expect(typedBody.success).toBe(true)
    expect(typedBody.message).toContain('permanently deleted')

    // Verify deletion cascade was called
    expect(mockedDb.notification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'db-user-001' },
    })
    expect(mockedDb.shipment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'db-user-001' },
    })
    expect(mockedDb.order.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'db-user-001' },
    })
    expect(mockedDb.user.delete).toHaveBeenCalledWith({
      where: { id: 'db-user-001' },
    })
  })
})
