import { NextRequest, NextResponse } from 'next/server'
import { onomondoLocationUpdateSchema } from '@/lib/validations/device'
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
 * POST /api/v1/device/onomondo/location-update
 *
 * Receives Location Update webhooks from Onomondo.
 * These fire on every cell tower change and provide cell-level location
 * (~50-867m accuracy) between firmware location reports.
 *
 * Authentication: API key in header (X-API-Key) or query param (?key=)
 * Rate limit: 120 req/min per API key
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `onomondo-location:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) return rateLimitResponse(rl)

    // Verify API key
    const expectedKey =
      process.env.ONOMONDO_WEBHOOK_API_KEY ||
      process.env.ONOMONDO_CONNECTOR_API_KEY ||
      process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      console.warn('[Onomondo location-update] 401 Invalid API key', {
        hasKey: !!apiKey,
      })
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const validated = onomondoLocationUpdateSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // If lat/lng are null, acknowledge but skip — return 200 so Onomondo doesn't retry
    if (data.location.lat === null || data.location.lng === null) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'No coordinates in location update',
      })
    }

    const lat = parseFloat(data.location.lat)
    const lng = parseFloat(data.location.lng)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Non-numeric coordinates',
      })
    }

    const result = await processLocationReport({
      iccid: data.iccid,
      imei: data.imei,
      cellLatitude: lat,
      cellLongitude: lng,
      accuracy: data.location.accuracy ?? undefined,
      recordedAt: data.time,
      source: 'CELL_TOWER',
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof LocationReportError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      )
    }
    console.error('[Onomondo location-update] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
