/**
 * Backfill Script: Reverse-Geocode Existing LocationEvents
 *
 * This script geocodes all LocationEvent records that have null geocodedCity.
 * It deduplicates by rounded lat/lng to minimize Nominatim API calls.
 *
 * Prerequisites:
 * - DATABASE_URL must be set in .env
 *
 * Usage:
 *   cd app && npx tsx scripts/backfill-geocoding.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

interface GeocodedResult {
  city: string
  country: string
  countryCode: string
}

async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedResult | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      {
        headers: {
          'User-Agent': 'TIP-Cargo-Tracking/1.0 (tip.live)',
        },
      }
    )

    if (!res.ok) return null

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

    if (city || country) {
      return { city: city || country, country, countryCode }
    }

    if (data.display_name) {
      const parts = data.display_name.split(', ')
      return {
        city: parts[0] || '',
        country: parts[parts.length - 1] || '',
        countryCode,
      }
    }

    return null
  } catch (err) {
    console.error(`  Nominatim error for ${lat},${lng}:`, err)
    return null
  }
}

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('Fetching un-geocoded location events...')

  const ungeocodedEvents = await prisma.locationEvent.findMany({
    where: { geocodedCity: null },
    select: { id: true, latitude: true, longitude: true },
  })

  console.log(`Found ${ungeocodedEvents.length} un-geocoded events`)

  if (ungeocodedEvents.length === 0) {
    console.log('Nothing to do!')
    await prisma.$disconnect()
    await pool.end()
    return
  }

  // Deduplicate by rounded coordinates to minimize API calls
  const coordMap = new Map<string, { lat: number; lng: number; ids: string[] }>()
  for (const event of ungeocodedEvents) {
    const key = `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`
    const entry = coordMap.get(key)
    if (entry) {
      entry.ids.push(event.id)
    } else {
      coordMap.set(key, { lat: event.latitude, lng: event.longitude, ids: [event.id] })
    }
  }

  console.log(`${coordMap.size} unique coordinate groups to geocode`)
  console.log(`Estimated time: ~${Math.ceil(coordMap.size * 1.1 / 60)} minutes\n`)

  let processed = 0
  let geocoded = 0
  let failed = 0

  for (const [key, { lat, lng, ids }] of coordMap) {
    const geo = await reverseGeocode(lat, lng)

    if (geo) {
      await prisma.locationEvent.updateMany({
        where: { id: { in: ids } },
        data: {
          geocodedCity: geo.city,
          geocodedCountry: geo.country,
          geocodedCountryCode: geo.countryCode,
        },
      })
      geocoded++
    } else {
      failed++
    }

    processed++
    if (processed % 10 === 0 || processed === coordMap.size) {
      console.log(
        `Progress: ${processed}/${coordMap.size} coords | ` +
        `${geocoded} geocoded, ${failed} failed | ` +
        `${ids.length} events at ${key}`
      )
    }

    // Rate limit: 1 request/second as per Nominatim policy
    await new Promise((r) => setTimeout(r, 1100))
  }

  console.log(`\nBackfill complete!`)
  console.log(`  Geocoded: ${geocoded}/${coordMap.size} unique coordinates`)
  console.log(`  Failed: ${failed}/${coordMap.size}`)
  console.log(`  Total events updated: ${ungeocodedEvents.length - failed}`)

  await prisma.$disconnect()
  await pool.end()
}

main().catch(console.error)
