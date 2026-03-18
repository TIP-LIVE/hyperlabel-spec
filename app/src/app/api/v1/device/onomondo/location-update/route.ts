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
import { createWebhookLog, updateWebhookLog, upsertWebhookLog, pruneWebhookLogs } from '@/lib/webhook-log'
import type { WebhookLogCreateParams } from '@/lib/webhook-log'

// --- In-memory dedup for Onomondo's double-delivery ---
const recentEvents = new Map<string, number>()
const DEDUP_WINDOW_MS = 30_000

function isDuplicate(key: string): boolean {
  const now = Date.now()
  // Evict stale entries
  for (const [k, ts] of recentEvents) {
    if (now - ts > DEDUP_WINDOW_MS * 2) recentEvents.delete(k)
  }
  if (recentEvents.has(key) && now - recentEvents.get(key)! < DEDUP_WINDOW_MS) {
    return true
  }
  recentEvents.set(key, now)
  return false
}

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
  const startTime = Date.now()
  const logId = crypto.randomUUID()
  let logCreated = false
  let webhookLogParams: WebhookLogCreateParams | null = null

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

    const rawBody = body as Record<string, unknown>

    // Deduplicate Onomondo's double-delivery (same iccid+time within 30s)
    const dedupeKey = `${rawBody?.iccid}:${rawBody?.time}`
    if (isDuplicate(dedupeKey)) {
      console.info('[webhook:location-update] DEDUP skipped', { iccid: rawBody?.iccid, time: rawBody?.time })
      return NextResponse.json({ success: true, deduplicated: true })
    }

    // Log every incoming webhook immediately — raw type and SIM info
    console.info('[webhook:location-update] INCOMING', {
      type: rawBody?.type,
      iccid: rawBody?.iccid,
      simLabel: rawBody?.sim_label,
      time: rawBody?.time,
      hasLocation: !!rawBody?.location,
      networkCountry: (rawBody?.network as Record<string, unknown>)?.country_code,
    })

    // Persist raw webhook for admin debug panel
    webhookLogParams = {
      id: logId,
      endpoint: 'location-update',
      headers: req.headers,
      body: rawBody,
      ipAddress: getClientIp(req),
      iccid: rawBody?.iccid as string | undefined,
      eventType: rawBody?.type as string | undefined,
    }
    try {
      await createWebhookLog(webhookLogParams)
      logCreated = true
    } catch (err) {
      console.error('[webhook:location-update] FAILED to persist webhook log', {
        logId, iccid: rawBody?.iccid, type: rawBody?.type, error: err,
      })
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

    // Return 200 immediately — Onomondo has a strict 1000ms timeout.
    // All processing (DB writes, geolocation, geocoding) happens in after().
    after(async () => {
      try {
        // Persist raw webhook log
        try {
          if (webhookLogParams) {
            await createWebhookLog(webhookLogParams)
            logCreated = true
          }
        } catch (err) {
          console.error('[webhook:location-update] FAILED to persist webhook log', {
            logId, iccid: data.iccid, type: data.type, error: err,
          })
        }

        // Auto-promote PENDING → IN_TRANSIT
        if (data.iccid) {
          try {
            const r = await db.shipment.updateMany({
              where: {
                OR: [
                  { label: { iccid: data.iccid } },
                  { shipmentLabels: { some: { label: { iccid: data.iccid } } } },
                ],
                status: 'PENDING',
              },
              data: { status: 'IN_TRANSIT' },
            })
            if (r.count > 0) {
              console.info(`[webhook:location-update] ${r.count} PENDING shipment(s) → IN_TRANSIT via ${data.type} event (iccid: ${data.iccid})`)
            }
          } catch (err) {
            console.warn('[webhook:location-update] PENDING→IN_TRANSIT update failed:', err)
          }
        }

        const loc = data.location ?? null

        console.info('[webhook:location-update] processing', {
          iccid: data.iccid,
          imei: data.imei,
          simLabel: data.sim_label,
          hasLocation: !!loc,
          lat: loc?.lat,
          lng: loc?.lng,
        })

        const mcc = parseInt(data.network.mcc, 10)
        const mnc = parseInt(data.network.mnc, 10)
        const lac = loc?.location_area_code ?? null
        const cid = loc?.cell_id ?? 0

        let lat: number | null = null
        let lng: number | null = null
        let accuracy: number | undefined = loc?.accuracy ?? undefined

        // Try Onomondo-provided coordinates first
        if (loc?.lat !== null && loc?.lat !== undefined && loc?.lng !== null && loc?.lng !== undefined) {
          const parsedLat = parseFloat(loc.lat)
          const parsedLng = parseFloat(loc.lng)
          if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            lat = parsedLat
            lng = parsedLng
          }
        }

        // Fallback: resolve cell tower coordinates via Google Geolocation API
        if (lat === null || lng === null) {
          if (!isNaN(mcc) && !isNaN(mnc)) {
            try {
              const resolved = await resolveCellTowerLocation(mcc, mnc, lac, cid)
              if (resolved) {
                lat = resolved.lat
                lng = resolved.lng
                accuracy = resolved.accuracyM
                console.info('[webhook:location-update] resolved via cell tower geolocation', {
                  iccid: data.iccid,
                  cell: `${mcc}:${mnc}:${lac ?? '?'}:${cid}`,
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

        // Fallback: use the last known location for this device
        if (lat === null || lng === null) {
          if (data.iccid) {
            const lastLocation = await db.locationEvent.findFirst({
              where: { label: { iccid: data.iccid }, source: 'CELL_TOWER' },
              orderBy: { recordedAt: 'desc' },
              select: { latitude: true, longitude: true, accuracyM: true },
            })
            if (lastLocation) {
              lat = lastLocation.latitude
              lng = lastLocation.longitude
              accuracy = lastLocation.accuracyM ?? undefined
              console.info('[webhook:location-update] using last known location', {
                iccid: data.iccid, lat, lng,
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
            hasLocation: !!loc,
          })
          const result = { success: true, skipped: true, reason: 'No coordinates available' }
          const skipParams = { statusCode: 200, processingResult: result, durationMs: Date.now() - startTime }
          if (logCreated) {
            await updateWebhookLog(logId, skipParams)
          } else if (webhookLogParams) {
            await upsertWebhookLog(webhookLogParams, skipParams)
          }
          return
        }

        const result = await processLocationReport({
          iccid: data.iccid,
          cellLatitude: lat,
          cellLongitude: lng,
          accuracy,
          recordedAt: data.time,
          source: 'CELL_TOWER',
          skipGeocode: true,
        })

        // Geocode + update webhook log
        await geocodeLocationEvent(result.locationId, lat, lng)

        const successParams = { statusCode: 200, processingResult: { success: true, locationId: result.locationId, shipmentId: result.shipmentId, deviceId: result.deviceId }, durationMs: Date.now() - startTime }
        if (logCreated) {
          await updateWebhookLog(logId, successParams)
        } else if (webhookLogParams) {
          await upsertWebhookLog(webhookLogParams, successParams)
        }

        // Probabilistic pruning of old webhook logs
        if (Math.random() < 0.05) await pruneWebhookLogs()
      } catch (error) {
        console.error('[webhook:location-update] after() processing error:', error)
        try {
          const errParams = { statusCode: 200, processingResult: { error: String(error) }, durationMs: Date.now() - startTime }
          if (logCreated) {
            await updateWebhookLog(logId, errParams)
          } else if (webhookLogParams) {
            await upsertWebhookLog(webhookLogParams, errParams)
          }
        } catch (logErr) {
          console.error('[webhook:location-update] failed to update webhook log', { logId, error: logErr })
        }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook:location-update] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
