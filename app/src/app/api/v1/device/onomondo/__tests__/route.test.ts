import { describe, it, expect } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

import { POST } from '../route'

describe('POST /api/v1/device/onomondo', () => {
  it('returns 410 Gone (endpoint disabled)', async () => {
    const req = createTestRequest('/api/v1/device/onomondo', {
      method: 'POST',
      body: { iccid: '89440000000000001' },
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(410)
    expect(body).toHaveProperty('error')
  })
})
