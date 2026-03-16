import { NextRequest, NextResponse, after } from 'next/server'
import { onomondoConnectorSchema } from '@/lib/validations/device'
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
import { verifyOnomondoRequest } from '@/lib/onomondo-auth'
import { createWebhookLog, updateWebhookLog, pruneWebhookLogs } from '@/lib/webhook-log'

/**
 * POST /api/v1/device/onomondo
 *
 * Receives location reports directly from Onomondo's HTTPS Connector.
 * Accepts the DeviceDataOut format from firmware, including offline_queue.
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

  try {
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `onomondo:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) return rateLimitResponse(rl)

    const expectedApiKey =
      process.env.ONOMONDO_CONNECTOR_API_KEY || process.env.DEVICE_API_KEY
    const expectedWebhookSecret = process.env.ONOMONDO_WEBHOOK_SECRET

    if (
      !verifyOnomondoRequest({
        req,
        expectedApiKey,
        expectedWebhookSecret,
      })
    ) {
      console.warn('[Onomondo connector] 401 Invalid webhook credentials', {
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
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const rawBody = body as Record<string, unknown>

    // Persist raw webhook for admin debug panel
    try {
      await createWebhookLog({
        id: logId,
        endpoint: 'connector',
        headers: req.headers,
        body: rawBody,
        ipAddress: getClientIp(req),
        iccid: rawBody?.iccid as string | undefined,
      })
    } catch (err) {
      console.error('[webhook:onomondo] FAILED to persist webhook log', {
        logId, iccid: rawBody?.iccid, error: String(err),
      })
    }

    const validated = onomondoConnectorSchema.safeParse(body)
    if (!validated.success) {
      console.warn('[webhook:onomondo] validation failed', {
        errors: validated.error.flatten(),
        body: JSON.stringify(body).slice(0, 500),
      })
      await updateWebhookLog(logId, { statusCode: 400, processingResult: { error: 'Validation failed', details: validated.error.flatten() }, durationMs: Date.now() - startTime })
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

    // Process synchronously (DB ops are fast) — skip geocoding to stay under 1000ms
    const result = await processLocationReport({
      iccid: data.iccid,
      imei: data.imei,
      latitude: data.latitude,
      longitude: data.longitude,
      battery: data.battery,
      recordedAt: data.timestamp,
      cellLatitude: data.onomondo_latitude,
      cellLongitude: data.onomondo_longitude,
      skipGeocode: true,
    })

    // Collect location IDs for deferred geocoding
    const toGeocode: { id: string; lat: number; lng: number }[] = []
    const effectiveLat = data.latitude ?? data.onomondo_latitude
    const effectiveLng = data.longitude ?? data.onomondo_longitude
    if (effectiveLat != null && effectiveLng != null) {
      toGeocode.push({ id: result.locationId, lat: effectiveLat, lng: effectiveLng })
    }

    // Process offline queue synchronously too
    if (data.offline_queue && data.offline_queue.length > 0) {
      for (const entry of data.offline_queue) {
        try {
          const offlineResult = await processLocationReport({
            iccid: data.iccid,
            imei: data.imei,
            latitude: entry.latitude,
            longitude: entry.longitude,
            battery: entry.battery_pct,
            recordedAt: entry.timestamp,
            isOfflineSync: true,
            skipGeocode: true,
          })
          if (entry.latitude != null && entry.longitude != null) {
            toGeocode.push({ id: offlineResult.locationId, lat: entry.latitude, lng: entry.longitude })
          }
        } catch (err) {
          console.warn(
            '[webhook:onomondo] failed to process offline entry:',
            err
          )
        }
      }
    }

    // Defer geocoding to after() — non-critical, can fail without data loss
    if (toGeocode.length > 0) {
      after(async () => {
        for (const loc of toGeocode) {
          await geocodeLocationEvent(loc.id, loc.lat, loc.lng)
        }
        // Probabilistic pruning of old webhook logs
        if (Math.random() < 0.05) await pruneWebhookLogs()
      })
    }

    await updateWebhookLog(logId, { statusCode: 200, processingResult: { success: true, locationId: result.locationId, shipmentId: result.shipmentId, deviceId: result.deviceId, offlineQueueProcessed: data.offline_queue?.length ?? 0 }, durationMs: Date.now() - startTime })
    return NextResponse.json({ success: true, locationId: result.locationId })
  } catch (error) {
    console.error('[Onomondo connector] error:', error)
    await updateWebhookLog(logId, { statusCode: 500, processingResult: { error: String(error) }, durationMs: Date.now() - startTime })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
