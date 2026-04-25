import { NextRequest, NextResponse, after } from 'next/server'
import { createHash } from 'crypto'
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
import { upsertWebhookLog, pruneWebhookLogs } from '@/lib/webhook-log'
import type { WebhookLogCreateParams } from '@/lib/webhook-log'

/**
 * Generate a deterministic webhook log ID from iccid + time.
 * Onomondo's double-delivery sends the same payload twice — using a
 * deterministic ID means both deliveries target the same DB row,
 * and the upsert naturally deduplicates.
 */
function deterministicLogId(iccid: string | undefined, time: string | undefined, type?: string): string {
  const key = `onomondo:${iccid ?? 'unknown'}:${time ?? Date.now()}:${type ?? 'unknown'}`
  return createHash('sha256').update(key).digest('hex').slice(0, 25)
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
 * Dedup strategy:
 * - Deterministic webhook log ID from iccid:time → DB upsert deduplicates
 *   Onomondo's double-delivery (same payload sent twice within seconds).
 * - LocationEvent has @@unique([labelId, recordedAt, lat, lng, source])
 *   as the final safety net against duplicate location records.
 * - Coordinate dedup in processLocationReport() skips events with
 *   identical coordinates within 5 minutes.
 *
 * Authentication: API key via X-API-Key / ?key=, or shared secret header.
 * Rate limit: 120 req/min per API key
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

  try {
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `onomondo-location:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) {
      console.warn('[webhook:location-update] rate limited', { key: apiKey ? '***' : 'none', remaining: rl.remaining })
      after(async () => {
        try {
          await upsertWebhookLog(
            { id: crypto.randomUUID(), endpoint: 'location-update', headers: req.headers, body: { _note: 'rate limited — body not parsed' }, ipAddress: getClientIp(req) },
            { statusCode: 429, processingResult: { error: 'Rate limited' }, durationMs: Date.now() - startTime }
          )
        } catch {}
      })
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
      after(async () => {
        try {
          await upsertWebhookLog(
            { id: crypto.randomUUID(), endpoint: 'location-update', headers: req.headers, body: { _note: 'auth failed — body not parsed' }, ipAddress: getClientIp(req) },
            { statusCode: 401, processingResult: { error: 'Invalid webhook credentials' }, durationMs: Date.now() - startTime }
          )
        } catch {}
      })
      return NextResponse.json({ error: 'Invalid webhook credentials' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch (err) {
      console.warn('[webhook:location-update] invalid JSON body', { error: String(err) })
      after(async () => {
        try {
          await upsertWebhookLog(
            { id: crypto.randomUUID(), endpoint: 'location-update', headers: req.headers, body: { _note: 'invalid JSON', error: String(err) }, ipAddress: getClientIp(req) },
            { statusCode: 400, processingResult: { error: 'Invalid JSON' }, durationMs: Date.now() - startTime }
          )
        } catch {}
      })
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const rawBody = body as Record<string, unknown>

    // Log every incoming webhook — raw type and SIM info
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
      after(async () => {
        try {
          await upsertWebhookLog(
            { id: crypto.randomUUID(), endpoint: 'location-update', headers: req.headers, body: rawBody, ipAddress: getClientIp(req), iccid: rawBody?.iccid as string | undefined, eventType: rawBody?.type as string | undefined },
            { statusCode: 400, processingResult: { error: 'Validation failed', details: validated.error.flatten() }, durationMs: Date.now() - startTime }
          )
        } catch {}
      })
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const data = validated.data

    // Deterministic ID: Onomondo double-sends produce the same ID,
    // so the upsert in after() naturally deduplicates at the DB level.
    const logId = deterministicLogId(data.iccid, data.time, data.type)

    // Prepare webhook log params — persisted in after() to keep sync path fast
    const webhookLogParams: WebhookLogCreateParams = {
      id: logId,
      endpoint: 'location-update',
      headers: req.headers,
      body: rawBody,
      ipAddress: getClientIp(req),
      iccid: data.iccid,
      eventType: data.type,
    }

    // Return 200 immediately — Onomondo has a strict 1000ms timeout.
    // ALL processing (DB writes, geolocation, geocoding) happens in after().
    after(async () => {
      try {
        // Always update lastSeenAt — even null-location webhooks are heartbeats
        if (data.iccid) {
          try {
            await db.label.updateMany({
              where: { iccid: data.iccid },
              data: { lastSeenAt: new Date() },
            })
          } catch (err) {
            console.warn('[webhook:location-update] lastSeenAt update failed:', err)
          }
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

        // Non-location events (network-registration, network-deregistration,
        // network-authentication, usage, etc.) are heartbeats only — they
        // carry no cell info, so the fallback chain below would either fail
        // (Google Geolocation needs cell_id) or grab the label's stale
        // lastLatitude/lastLongitude. Either way it writes a phantom
        // LocationEvent at coords that don't reflect the device's current
        // position. The phantom then blocks the next real `location` webhook
        // via the velocity sanity check ("teleportation rejected"), pinning
        // the label to its first geocoded position forever — exactly the bug
        // that made Andrii's traveler_CN label show "Bao'an District" while
        // the container was actually in Yantian (50km east).
        //
        // Per CLAUDE.md "Accept ALL event types": non-location events update
        // lastSeenAt + can auto-promote PENDING → IN_TRANSIT (already done
        // above), and that is ALL they should do.
        if (data.type !== 'location') {
          console.info('[webhook:location-update] heartbeat-only (no LocationEvent)', {
            iccid: data.iccid,
            type: data.type,
          })
          await upsertWebhookLog(webhookLogParams, {
            statusCode: 200,
            processingResult: { success: true, heartbeat: true, type: data.type },
            durationMs: Date.now() - startTime,
          })
          return
        }

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
              const radioType = data.network_type || undefined
              const resolved = await resolveCellTowerLocation(mcc, mnc, lac, cid, radioType)
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

        // Fallback: use the last known location cached on the Label
        let usingCachedLocation = false
        if (lat === null || lng === null) {
          if (data.iccid) {
            const label = await db.label.findFirst({
              where: { iccid: data.iccid },
              select: { lastLatitude: true, lastLongitude: true },
            })
            if (label?.lastLatitude != null && label?.lastLongitude != null) {
              lat = label.lastLatitude
              lng = label.lastLongitude
              usingCachedLocation = true
              console.info('[webhook:location-update] using last known location from label', {
                iccid: data.iccid, lat, lng,
              })
            }
          }
        }

        // If still no coordinates, persist webhook log and skip
        if (lat === null || lng === null) {
          console.info('[webhook:location-update] skipped — no coordinates', {
            iccid: data.iccid,
            simLabel: data.sim_label,
            cell: `${mcc}:${mnc}:${lac ?? '?'}:${cid}`,
            hasLocation: !!loc,
          })
          const result = { success: true, skipped: true, reason: 'No coordinates available' }
          await upsertWebhookLog(webhookLogParams, { statusCode: 200, processingResult: result, durationMs: Date.now() - startTime })
          return
        }

        const result = await processLocationReport({
          iccid: data.iccid,
          // IMEI is passed so auto-registration can build the 9-digit
          // displayId (counter + last-4 of IMEI). Label resolution stays
          // ICCID-first — the existing iccid-override below handles the
          // rare SIM-moved-to-different-device case.
          imei: data.imei || undefined,
          cellLatitude: lat,
          cellLongitude: lng,
          accuracy,
          recordedAt: data.time,
          source: 'CELL_TOWER',
          skipGeocode: true,
          skipLocationCache: usingCachedLocation,
          eventType: data.type,
        })

        // Geocode + persist webhook log with final status
        if (result.locationId) {
          await geocodeLocationEvent(result.locationId, lat, lng)
        }

        await upsertWebhookLog(webhookLogParams, {
          statusCode: 200,
          processingResult: { success: true, locationId: result.locationId || null, shipmentId: result.shipmentId, deviceId: result.deviceId },
          durationMs: Date.now() - startTime,
        })

        // Probabilistic pruning of old webhook logs
        if (Math.random() < 0.05) await pruneWebhookLogs()
      } catch (error) {
        console.error('[webhook:location-update] after() processing error:', error)
        try {
          await upsertWebhookLog(webhookLogParams, {
            statusCode: 200,
            processingResult: { error: String(error) },
            durationMs: Date.now() - startTime,
          })
        } catch (logErr) {
          console.error('[webhook:location-update] failed to persist webhook log', { logId, error: logErr })
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
