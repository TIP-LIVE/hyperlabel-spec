import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, RATE_LIMIT_DEVICE, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * GET /api/v1/device/lookup?imei=123456789012345
 * GET /api/v1/device/lookup?iccid=8945730000000000000
 *
 * Resolves an IMEI or ICCID to a TIP deviceId.
 * Used by the GPS tracker backend (label.utec.ua / Cloud Run) to map
 * hardware identifiers to TIP's Label records.
 *
 * Authentication: API key in header (X-API-Key) or query param (?key=)
 * Rate limit: 120 req/min per API key
 */
export async function GET(req: NextRequest) {
  try {
    // Rate limit
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')
    const rl = rateLimit(`device:${apiKey || getClientIp(req)}`, RATE_LIMIT_DEVICE)
    if (!rl.success) return rateLimitResponse(rl)

    // Verify API key
    const expectedKey = process.env.DEVICE_API_KEY
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }

    const imei = req.nextUrl.searchParams.get('imei')
    const iccid = req.nextUrl.searchParams.get('iccid')

    if (!imei && !iccid) {
      return NextResponse.json(
        { error: 'Missing parameter', details: 'Provide ?imei= or ?iccid=' },
        { status: 400 }
      )
    }

    // Look up label by IMEI or ICCID
    const label = await db.label.findFirst({
      where: imei ? { imei } : { iccid },
      select: {
        deviceId: true,
        imei: true,
        iccid: true,
        status: true,
        batteryPct: true,
      },
    })

    if (!label) {
      return NextResponse.json(
        { error: 'Device not found', details: `No label found for ${imei ? `IMEI ${imei}` : `ICCID ${iccid}`}` },
        { status: 404 }
      )
    }

    return NextResponse.json({
      deviceId: label.deviceId,
      imei: label.imei,
      iccid: label.iccid,
      status: label.status,
      batteryPct: label.batteryPct,
    })
  } catch (error) {
    console.error('Error looking up device:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
