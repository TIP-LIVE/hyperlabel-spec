import { NextRequest, NextResponse } from 'next/server'
import { deviceReportSchema } from '@/lib/validations/device'
import { db } from '@/lib/db'
import {
  rateLimit,
  RATE_LIMIT_DEVICE,
  getClientIp,
  rateLimitResponse,
} from '@/lib/rate-limit'

/**
 * POST /api/v1/device/report
 *
 * Battery-only heartbeat endpoint for label.utec.ua's tip_forwarder.
 *
 * History: this endpoint originally accepted full location reports (GPS +
 * battery) from label.utec.ua's TCP listener. In March 2026 it was disabled
 * because GPS reports were creating duplicate cell-tower location events
 * (see 7e4be61). Disabling it also silently dropped battery tracking, since
 * the Onomondo location-update webhook that replaced it doesn't carry
 * battery voltage. This rewrite restores the endpoint for battery only:
 *
 *   - Accepts the same payload label.utec.ua already sends (zero changes
 *     on their side — tip_forwarder.py just works again)
 *   - Updates `label.batteryPct` and `label.lastSeenAt`
 *   - IGNORES lat/lng/accuracy/cell coords — all location data continues
 *     to come from the Onomondo webhook
 *   - Does NOT create LocationEvents
 *
 * Auth: X-API-Key header matching DEVICE_API_KEY (same key label.utec.ua
 * already has stored as TIP_API_KEY).
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit by API key or IP
    const apiKey =
      req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(
      `device:${apiKey || getClientIp(req)}`,
      RATE_LIMIT_DEVICE
    )
    if (!rl.success) {
      return rateLimitResponse(rl)
    }

    // Auth: shared secret with label.utec.ua
    const expectedKey = process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[device-report] 401 invalid api key', { hasKey: !!apiKey })
      }
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = deviceReportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const input = parsed.data

    // Resolve label by deviceId | iccid | imei (in priority order).
    // ICCID before IMEI because SIMs can move between devices.
    let label = null as { id: string; deviceId: string; batteryPct: number | null; lastSeenAt: Date | null } | null

    if (input.deviceId) {
      label = await db.label.findUnique({
        where: { deviceId: input.deviceId },
        select: { id: true, deviceId: true, batteryPct: true, lastSeenAt: true },
      })
    }
    if (!label && input.iccid) {
      label = await db.label.findFirst({
        where: { iccid: input.iccid },
        select: { id: true, deviceId: true, batteryPct: true, lastSeenAt: true },
      })
    }
    if (!label && input.imei) {
      label = await db.label.findFirst({
        where: { imei: input.imei },
        select: { id: true, deviceId: true, batteryPct: true, lastSeenAt: true },
      })
    }

    if (!label) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Build update: battery if provided, lastSeenAt if newer.
    // We intentionally ignore lat/lng/accuracy/cell coords — Onomondo's
    // location-update webhook is the only source for location data.
    const now = new Date()
    const updates: Record<string, unknown> = {}

    if (input.battery !== undefined) {
      const pct = Math.max(0, Math.min(100, Math.round(input.battery)))
      if (pct !== label.batteryPct) {
        updates.batteryPct = pct
      }
    }
    if (!label.lastSeenAt || now > label.lastSeenAt) {
      updates.lastSeenAt = now
    }

    if (Object.keys(updates).length > 0) {
      await db.label.update({
        where: { id: label.id },
        data: updates,
      })
    }

    return NextResponse.json({
      ok: true,
      labelId: label.id,
      deviceId: label.deviceId,
      batteryPct: updates.batteryPct ?? label.batteryPct,
      ignored: 'location data (use Onomondo webhook)',
    })
  } catch (error) {
    console.error('[device-report] unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
