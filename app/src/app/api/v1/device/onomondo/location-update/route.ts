import { NextRequest, NextResponse, after } from 'next/server'
import { onomondoLocationUpdateSchema } from '@/lib/validations/device'
import {
  processLocationReport,
  shouldSkipDuplicateLocation,
} from '@/lib/device-report'
import {
  rateLimit,
  RATE_LIMIT_DEVICE,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { resolveCellTowerLocation } from '@/lib/cell-geolocation'
import { db } from '@/lib/db'

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
    if (!rl.success) {
      console.warn('[webhook:location-update] rate limited', { key: apiKey ? '***' : 'none', remaining: rl.remaining })
      return rateLimitResponse(rl)
    }

    // Verify API key
    const expectedKey =
      process.env.ONOMONDO_WEBHOOK_API_KEY ||
      process.env.ONOMONDO_CONNECTOR_API_KEY ||
      process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      console.warn('[webhook:location-update] 401 Invalid API key', {
        hasKey: !!apiKey,
      })
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
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

    // Only process "location" type events
    if (data.type !== 'location') {
      console.info('[webhook:location-update] skipped non-location type', { type: data.type })
      return NextResponse.json({ success: true, skipped: true, reason: `Ignored type: ${data.type}` })
    }

    console.info('[webhook:location-update] received', {
      iccid: data.iccid,
      imei: data.imei,
      simLabel: data.sim_label,
      lat: data.location.lat,
      lng: data.location.lng,
    })

    // Return 200 immediately — process in background to avoid 1000ms timeout
    after(async () => {
      try {
        const mcc = parseInt(data.network.mcc, 10)
        const mnc = parseInt(data.network.mnc, 10)
        const lac = data.location.location_area_code
        const cid = data.location.cell_id

        let lat: number | null = null
        let lng: number | null = null
        let accuracy: number | undefined = data.location.accuracy ?? undefined

        // Try Onomondo-provided coordinates first
        if (data.location.lat !== null && data.location.lng !== null) {
          const parsedLat = parseFloat(data.location.lat)
          const parsedLng = parseFloat(data.location.lng)
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat
            lng = parsedLng
          }
        }

        // Fallback: resolve cell tower coordinates via Google Geolocation API
        if (lat === null || lng === null) {
          if (lac !== null && !isNaN(mcc) && !isNaN(mnc)) {
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
          }
        }

        // If still no coordinates, skip
        if (lat === null || lng === null) {
          console.info('[webhook:location-update] skipped — no coordinates', {
            iccid: data.iccid,
            simLabel: data.sim_label,
            cell: `${mcc}:${mnc}:${lac ?? '?'}:${cid}`,
            onomondoLatNull: data.location.lat === null,
          })
          return
        }

        // Dedup: skip if a recent event already exists nearby for this label
        const shouldSkip = await shouldSkipDuplicateLocation({
          iccid: data.iccid,
          latitude: lat,
          longitude: lng,
          source: 'CELL_TOWER',
        })

        if (shouldSkip) {
          // Device is online but location is duplicate — still record the heartbeat
          await db.label.update({
            where: { iccid: data.iccid },
            data: { lastSeenAt: new Date() },
          })
          console.info('[webhook:location-update] dedup skip', {
            iccid: data.iccid,
            lat,
            lng,
          })
          return
        }

        await processLocationReport({
          iccid: data.iccid,
          imei: data.imei || undefined,
          cellLatitude: lat,
          cellLongitude: lng,
          accuracy,
          recordedAt: data.time,
          source: 'CELL_TOWER',
        })
      } catch (error) {
        console.error('[webhook:location-update] background processing error:', error)
      }
    })

    return NextResponse.json({ success: true, queued: true })
  } catch (error) {
    console.error('[webhook:location-update] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
