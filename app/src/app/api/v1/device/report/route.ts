import { NextRequest, NextResponse } from 'next/server'
import { deviceReportSchema } from '@/lib/validations/device'
import {
  processLocationReport,
  LocationReportError,
} from '@/lib/device-report'
import {
  rateLimit,
  RATE_LIMIT_DEVICE,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'

/**
 * POST /api/v1/device/report
 *
 * DISABLED: GPS-source location reports are no longer used.
 * All location data now comes from Onomondo location-update webhook (CELL_TOWER source).
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint disabled – use Onomondo location-update webhook' },
    { status: 410 },
  )
}

/* eslint-disable @typescript-eslint/no-unused-vars */
async function _POST_DISABLED(req: NextRequest) {
  try {
    // Rate limit by API key or IP
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `device:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) {
      console.warn('[webhook:device-report] rate limited', { key: apiKey ? '***' : 'none', remaining: rl.remaining })
      return rateLimitResponse(rl)
    }

    // Verify API key (simple auth for device endpoints)
    const expectedKey = process.env.DEVICE_API_KEY

    if (expectedKey && apiKey !== expectedKey) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[webhook:device-report] 401 Invalid API key', {
          hasKey: !!apiKey,
        })
      }
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (err) {
      console.warn('[webhook:device-report] invalid JSON body', { error: String(err) })
      return NextResponse.json(
        {
          error: 'Invalid JSON',
          details: 'Request body must be valid JSON',
        },
        { status: 400 }
      )
    }
    const validated = deviceReportSchema.safeParse(body)

    if (!validated.success) {
      console.warn('[webhook:device-report] validation failed', { errors: validated.error.flatten() })
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    console.info('[webhook:device-report] received', {
      deviceId: validated.data.deviceId,
      imei: validated.data.imei,
      iccid: validated.data.iccid,
      lat: validated.data.latitude,
      lng: validated.data.longitude,
    })

    // Delegate to shared processing logic
    const result = await processLocationReport(validated.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof LocationReportError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      )
    }
    console.error('Error processing device report:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
