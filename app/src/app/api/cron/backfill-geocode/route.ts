import { db } from '@/lib/db'
import { reverseGeocode } from '@/lib/geocoding'
import { isNullIsland } from '@/lib/validations/device'
import { withCronLogging } from '@/lib/cron'

/**
 * GET /api/cron/backfill-geocode
 * Scheduled cron that geocodes LocationEvent records missing geocoded data.
 * Runs daily to catch any records where geocoding failed at ingest time
 * (Nominatim rate limits, transient errors, etc.).
 *
 * Processes up to 200 records per run with 1.1s delay between requests
 * to respect Nominatim's 1 req/sec policy.
 */
export const GET = withCronLogging('backfill-geocode', async () => {
  // Find location events that have coordinates but no geocoded city AND
  // haven't been attempted in the last 24h. The ≥24h window avoids pounding
  // Nominatim with permanently-unresolvable coords (rural/remote locations
  // that returned null once will keep returning null — retry sparsely).
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const ungeocoded = await db.locationEvent.findMany({
    where: {
      geocodedCity: null,
      latitude: { not: 0 },
      longitude: { not: 0 },
      OR: [
        { geocodedAt: null },
        { geocodedAt: { lt: twentyFourHoursAgo } },
      ],
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
      // Still stamp geocodedAt so we don't reconsider (0,0) rows every day.
      await db.locationEvent.update({
        where: { id: loc.id },
        data: { geocodedAt: new Date() },
      })
      failed++
      continue
    }

    // Rate limit: Nominatim allows 1 req/sec
    await new Promise((r) => setTimeout(r, 1100))

    try {
      const geo = await reverseGeocode(loc.latitude, loc.longitude)
      // Stamp geocodedAt on every attempt — success OR null result — so the
      // next cron run doesn't immediately retry the same row.
      await db.locationEvent.update({
        where: { id: loc.id },
        data: geo
          ? {
              geocodedCity: geo.city,
              geocodedArea: geo.area,
              geocodedCountry: geo.country,
              geocodedCountryCode: geo.countryCode,
              geocodedAt: new Date(),
            }
          : { geocodedAt: new Date() },
      })
      if (geo) geocoded++
      else failed++
    } catch {
      // Even on exception, mark attempted so one broken row doesn't block
      // the batch on every run.
      await db.locationEvent
        .update({
          where: { id: loc.id },
          data: { geocodedAt: new Date() },
        })
        .catch(() => {})
      failed++
    }
  }

  return { found: ungeocoded.length, geocoded, failed }
})
