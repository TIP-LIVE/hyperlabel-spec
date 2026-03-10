import { NextRequest, NextResponse } from 'next/server'
import { onomondoConnectorSchema } from '@/lib/validations/device'
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
 * POST /api/v1/device/onomondo
 *
 * Receives location reports directly from Onomondo's HTTPS Connector.
 * Accepts the DeviceDataOut format from firmware, including offline_queue.
 *
 * Authentication: API key in header (X-API-Key) or query param (?key=)
 * Rate limit: 120 req/min per API key
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `onomondo:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) return rateLimitResponse(rl)

    // Verify API key
    const expectedKey =
      process.env.ONOMONDO_CONNECTOR_API_KEY || process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      console.warn('[Onomondo connector] 401 Invalid API key', {
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

    const validated = onomondoConnectorSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    console.info('[webhook:onomondo] received', {
      iccid: data.iccid,
      imei: data.imei,
      lat: data.latitude,
      lng: data.longitude,
      battery: data.battery,
      offlineQueue: data.offline_queue?.length ?? 0,
    })

    // Process the main report
    const mainResult = await processLocationReport({
      iccid: data.iccid,
      imei: data.imei,
      latitude: data.latitude,
      longitude: data.longitude,
      battery: data.battery,
      recordedAt: data.timestamp,
      cellLatitude: data.onomondo_latitude,
      cellLongitude: data.onomondo_longitude,
    })

    // Process offline queue — each entry becomes its own LocationEvent
    const offlineResults: string[] = []
    if (data.offline_queue && data.offline_queue.length > 0) {
      for (const entry of data.offline_queue) {
        try {
          const offResult = await processLocationReport({
            iccid: data.iccid,
            imei: data.imei,
            latitude: entry.latitude,
            longitude: entry.longitude,
            battery: entry.battery_pct,
            recordedAt: entry.timestamp,
            isOfflineSync: true,
          })
          offlineResults.push(offResult.locationId)
        } catch (err) {
          console.warn(
            '[Onomondo connector] failed to process offline entry:',
            err
          )
        }
      }
    }

    return NextResponse.json({
      ...mainResult,
      offlineProcessed: offlineResults.length,
    })
  } catch (error) {
    if (error instanceof LocationReportError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.statusCode }
      )
    }
    console.error('[Onomondo connector] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
