import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reverseGeocode } from '@/lib/geocoding'
import { isNullIsland } from '@/lib/validations/device'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/backfill-geocode
 * Scheduled cron that geocodes LocationEvent records missing geocoded data.
 * Runs daily to catch any records where geocoding failed at ingest time
 * (Nominatim rate limits, transient errors, etc.).
 *
 * Processes up to 200 records per run with 1.1s delay between requests
 * to respect Nominatim's 1 req/sec policy.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Find location events that have coordinates but no geocoded city
    const ungeocoded = await db.locationEvent.findMany({
      where: {
        geocodedCity: null,
        latitude: { not: 0 },
        longitude: { not: 0 },
      },
      select: {
        id: true,
        latitude: true,
        longitude: true,
      },
      orderBy: { recordedAt: 'desc' },
      take: 200,
    })

    let geocoded = 0
    let failed = 0

    for (const loc of ungeocoded) {
      if (isNullIsland(loc.latitude, loc.longitude)) {
        failed++
        continue
      }

      // Rate limit: Nominatim allows 1 req/sec
      await new Promise((r) => setTimeout(r, 1100))

      try {
        const geo = await reverseGeocode(loc.latitude, loc.longitude)
        if (geo) {
          await db.locationEvent.update({
            where: { id: loc.id },
            data: {
              geocodedCity: geo.city,
              geocodedArea: geo.area,
              geocodedCountry: geo.country,
              geocodedCountryCode: geo.countryCode,
            },
          })
          geocoded++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      found: ungeocoded.length,
      geocoded,
      failed,
    })
  } catch (error) {
    console.error('[backfill-geocode] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
