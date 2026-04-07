import { describe, it, expect } from 'vitest'
import { createTestRequest, parseResponse } from '@/test/helpers/api'

import { POST } from '../route'

// Endpoint history: originally returned 410 Gone, then re-enabled in March 2026
// as a battery-only heartbeat for label.utec.ua's tip_forwarder. See route.ts
// header comment for full context.
describe('POST /api/v1/device/report', () => {
  it('returns 404 when no label matches the deviceId', async () => {
    const req = createTestRequest('/api/v1/device/report', {
      method: 'POST',
      body: { deviceId: 'TIP-001', latitude: 48.8566, longitude: 2.3522 },
      headers: { 'X-API-Key': 'test-device-api-key' },
    })

    const res = await POST(req)
    const { status, body } = await parseResponse(res)

    expect(status).toBe(404)
    expect(body).toHaveProperty('error')
  })
})
