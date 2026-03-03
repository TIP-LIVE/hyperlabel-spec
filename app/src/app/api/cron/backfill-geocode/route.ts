import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/backfill-geocode
 * One-time cron to re-geocode existing LocationEvent records with English place names.
 * Safe to run multiple times — overwrites native-language names with English equivalents.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get distinct geocoded locations (unique city+country pairs)
    const distinctLocations = await db.locationEvent.findMany({
      where: { geocodedCity: { not: null } },
      distinct: ['geocodedCity', 'geocodedCountry'],
      select: {
        latitude: true,
        longitude: true,
        geocodedCity: true,
        geocodedCountry: true,
      },
    })

    let updated = 0
    let skipped = 0

    for (const loc of distinctLocations) {
      // Rate limit: Nominatim allows 1 req/sec
      await new Promise((r) => setTimeout(r, 1100))

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${loc.latitude}&lon=${loc.longitude}&format=json&zoom=10&accept-language=en`,
        { headers: { 'User-Agent': 'TIP-Cargo-Tracking/1.0 (tip.live)' } }
      )

      if (!res.ok) {
        skipped++
        continue
      }

      const data = await res.json()
      const address = data.address || {}
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        ''
      const country = address.country || ''
      const countryCode = (address.country_code || '').toUpperCase()

      if (!city && !country) {
        skipped++
        continue
      }

      await db.locationEvent.updateMany({
        where: {
          geocodedCity: loc.geocodedCity,
          geocodedCountry: loc.geocodedCountry,
        },
        data: {
          geocodedCity: city || country,
          geocodedCountry: country,
          geocodedCountryCode: countryCode,
        },
      })
      updated++
    }

    return NextResponse.json({
      success: true,
      totalDistinct: distinctLocations.length,
      updated,
      skipped,
    })
  } catch (error) {
    console.error('[backfill-geocode] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
