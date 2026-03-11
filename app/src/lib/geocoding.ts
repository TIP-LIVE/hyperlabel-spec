import { db } from '@/lib/db'

export interface GeocodedResult {
  city: string
  area: string        // Suburb/neighbourhood-level for detail view
  country: string
  countryCode: string
}

// In-memory cache to avoid redundant API calls within the same server process
const geocodeCache = new Map<string, GeocodedResult>()

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

/**
 * Reverse geocode a lat/lng to a city-level place name.
 * Uses OpenStreetMap Nominatim (free, no API key).
 *
 * Cache hierarchy:
 * 1. In-memory Map (fastest, survives within same server process)
 * 2. DB lookup (check if a nearby LocationEvent already has geocoded data)
 * 3. Nominatim API call (slowest, ~1-2s)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedResult | null> {
  const key = cacheKey(lat, lng)

  // 1. Check in-memory cache
  const cached = geocodeCache.get(key)
  if (cached) return cached

  // 2. Check DB for a nearby already-geocoded record
  const roundedLat = parseFloat(lat.toFixed(3))
  const roundedLng = parseFloat(lng.toFixed(3))
  try {
    const existing = await db.locationEvent.findFirst({
      where: {
        latitude: { gte: roundedLat - 0.0005, lte: roundedLat + 0.0005 },
        longitude: { gte: roundedLng - 0.0005, lte: roundedLng + 0.0005 },
        geocodedCity: { not: null },
      },
      select: {
        geocodedCity: true,
        geocodedArea: true,
        geocodedCountry: true,
        geocodedCountryCode: true,
      },
    })
    if (existing?.geocodedCity) {
      const result: GeocodedResult = {
        city: existing.geocodedCity,
        area: existing.geocodedArea || '',
        country: existing.geocodedCountry || '',
        countryCode: existing.geocodedCountryCode || '',
      }
      geocodeCache.set(key, result)
      return result
    }
  } catch {
    // DB lookup failure shouldn't block geocoding
  }

  // 3. Call Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&accept-language=en`,
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
    const area =
      address.suburb ||
      address.neighbourhood ||
      address.borough ||
      address.quarter ||
      address.city_district ||
      ''
    const country = address.country || ''
    const countryCode = (address.country_code || '').toUpperCase()

    if (city || country) {
      const result: GeocodedResult = { city: city || country, area, country, countryCode }
      geocodeCache.set(key, result)
      return result
    }

    // Fallback: use first part of display_name
    if (data.display_name) {
      const parts = data.display_name.split(', ')
      const result: GeocodedResult = {
        city: parts[0] || '',
        area: '',
        country: parts[parts.length - 1] || '',
        countryCode,
      }
      geocodeCache.set(key, result)
      return result
    }

    return null
  } catch {
    return null
  }
}
