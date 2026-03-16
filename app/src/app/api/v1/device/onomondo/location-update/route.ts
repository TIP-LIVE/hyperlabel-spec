import { NextRequest, NextResponse, after } from 'next/server'
import { onomondoLocationUpdateSchema } from '@/lib/validations/device'
import {
  processLocationReport,
  geocodeLocationEvent,
} from '@/lib/device-report'
import {
  rateLimit,
  RATE_LIMIT_DEVICE,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { resolveCellTowerLocation } from '@/lib/cell-geolocation'
import { db } from '@/lib/db'
import { verifyOnomondoRequest } from '@/lib/onomondo-auth'

/**
 * POST /api/v1/device/onomondo/location-update
 *
 * Receives Location Update webhooks from Onomondo.
 * These fire on every cell tower change and provide cell-level location
 * (~50-867m accuracy) between firmware location reports.
 *
 * Returns 200 immediately after validation, then processes in background
 * via after() to avoid Onomondo's 1000ms webhook timeout.
 *
 * Authentication: API key via X-API-Key / ?key=, or shared secret header.
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
    if (!rl.success) {
      console.warn('[webhook:location-update] rate limited', { key: apiKey ? '***' : 'none', remaining: rl.remaining })
      return rateLimitResponse(rl)
    }

    const expectedApiKey =
      process.env.ONOMONDO_WEBHOOK_API_KEY ||
      process.env.ONOMONDO_CONNECTOR_API_KEY ||
      process.env.DEVICE_API_KEY
    const expectedWebhookSecret = process.env.ONOMONDO_WEBHOOK_SECRET

    if (
      !verifyOnomondoRequest({
        req,
        expectedApiKey,
        expectedWebhookSecret,
      })
    ) {
      console.warn('[webhook:location-update] 401 Invalid webhook credentials', {
        hasApiKey: !!apiKey,
        hasWebhookSecret:
          !!req.headers.get('x-onomondo-webhook-secret') ||
          !!req.headers.get('x-webhook-secret') ||
          !!req.headers.get('authorization'),
      })
      return NextResponse.json({ error: 'Invalid webhook credentials' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (err) {
      console.warn('[webhook:location-update] invalid JSON body', { error: String(err) })
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    // Log every incoming webhook immediately — raw type and SIM info
    const rawBody = body as Record<string, unknown>
    console.info('[webhook:location-update] INCOMING', {
      type: rawBody?.type,
      iccid: rawBody?.iccid,
      simLabel: rawBody?.sim_label,
      time: rawBody?.time,
      hasLocation: !!rawBody?.location,
      networkCountry: (rawBody?.network as Record<string, unknown>)?.country_code,
    })

    const validated = onomondoLocationUpdateSchema.safeParse(body)
    if (!validated.success) {
      console.warn('[webhook:location-update] validation failed', {
        errors: validated.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // Update lastSeenAt for ANY event type — proves the device is online
    // even when there's no new location data
    if (data.iccid) {
      db.label.updateMany({
        where: { iccid: data.iccid },
        data: { lastSeenAt: new Date() },
      }).catch((err) =>
        console.warn('[webhook:location-update] lastSeenAt update failed:', err)
      )
    }

    // Only process "location" type events for coordinates
    if (data.type !== 'location' || !data.location) {
      console.info('[webhook:location-update] skipped non-location type (lastSeenAt updated)', { type: data.type, simLabel: data.sim_label })
      return NextResponse.json({ success: true, skipped: true, reason: `Ignored type: ${data.type}` })
    }

    const loc = data.location

    console.info('[webhook:location-update] received', {
      iccid: data.iccid,
      imei: data.imei,
      simLabel: data.sim_label,
      lat: loc.lat,
      lng: loc.lng,
    })

    // Process synchronously — DB ops are fast, only defer geocoding
    const mcc = parseInt(data.network.mcc, 10)
    const mnc = parseInt(data.network.mnc, 10)
    const lac = loc.location_area_code
    const cid = loc.cell_id

    let lat: number | null = null
    let lng: number | null = null
    let accuracy: number | undefined = loc.accuracy ?? undefined

    // Try Onomondo-provided coordinates first
    if (loc.lat !== null && loc.lng !== null) {
      const parsedLat = parseFloat(loc.lat)
      const parsedLng = parseFloat(loc.lng)
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        lat = parsedLat
        lng = parsedLng
      }
    }

    // Fallback: resolve cell tower coordinates via Google Geolocation API
    // This external call is fast (~100-200ms) and critical for getting any location
    if (lat === null || lng === null) {
      if (lac !== null && !isNaN(mcc) && !isNaN(mnc)) {
        try {
          const resolved = await resolveCellTowerLocation(mcc, mnc, lac, cid)
          if (resolved) {
            lat = resolved.lat
            lng = resolved.lng
            accuracy = resolved.accuracyM
            console.info('[webhook:location-update] resolved via cell tower geolocation', {
              iccid: data.iccid,
              cell: `${mcc}:${mnc}:${lac}:${cid}`,
              lat,
              lng,
              accuracyM: accuracy,
            })
          }
        } catch (err) {
          console.warn('[webhook:location-update] cell tower geolocation failed:', err)
        }
      }
    }

    // If still no coordinates, skip
    if (lat === null || lng === null) {
      console.info('[webhook:location-update] skipped — no coordinates', {
        iccid: data.iccid,
        simLabel: data.sim_label,
        cell: `${mcc}:${mnc}:${lac ?? '?'}:${cid}`,
        onomondoLatNull: loc.lat === null,
      })
      return NextResponse.json({ success: true, skipped: true, reason: 'No coordinates available' })
    }

    const result = await processLocationReport({
      iccid: data.iccid,
      imei: data.imei || undefined,
      cellLatitude: lat,
      cellLongitude: lng,
      accuracy,
      recordedAt: data.time,
      source: 'CELL_TOWER',
      skipGeocode: true,
    })

    // Defer only geocoding to after() — non-critical
    after(async () => {
      await geocodeLocationEvent(result.locationId, lat!, lng!)
    })

    return NextResponse.json({ success: true, locationId: result.locationId })
  } catch (error) {
    console.error('[webhook:location-update] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
