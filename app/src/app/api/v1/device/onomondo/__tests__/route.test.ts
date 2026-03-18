import { describe, it, expect, vi } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

import { POST } from '../route'

// Mock verifyOnomondoRequest to return false (no valid credentials in test)
vi.mock('@/lib/onomondo-auth', () => ({
  verifyOnomondoRequest: () => false,
}))

describe('POST /api/v1/device/onomondo', () => {
  it('returns 401 when credentials are invalid', async () => {
    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: { iccid: '89440000000000001' },
      headers: { 'X-API-Key': 'invalid-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(401)
    expect(body).toHaveProperty('error')
  })
})
