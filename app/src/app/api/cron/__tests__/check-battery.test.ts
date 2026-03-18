import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    label: {
      findMany: vi.fn(),
    },
    notification: {
      findFirst: vi.fn(),
    },
    cronExecutionLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { GET } from '../check-battery/route'
import { db } from '@/lib/db'

const mockedDb = vi.mocked(db)

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/cron/check-battery', () => {
  it('returns 401 without valid CRON_SECRET', async () => {
    const req = createTestRequest('/api/cron/check-battery')
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect((body as { error: string }).error).toBe('Unauthorized')
  })

  it('returns success with checked count', async () => {
    mockedDb.label.findMany.mockResolvedValue([] as never)

    const req = createTestRequest('/api/cron/check-battery', {
      headers: { Authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(200)
    const typedBody = body as { success: boolean; checked: number; notificationsSent: number }
    expect(typedBody.success).toBe(true)
    expect(typedBody.checked).toBe(0)
    expect(typedBody.notificationsSent).toBe(0)
  })
})
