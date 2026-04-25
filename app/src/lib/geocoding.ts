import { db } from '@/lib/db'
import { haversineDistanceM } from '@/lib/utils/geo'

export interface GeocodedResult {
  city: string
  area: string        // Suburb/neighbourhood-level for detail view
  country: string
  countryCode: string
}

// Nominatim's public endpoint is fronted by a CDN/cache proxy that, under
// burst load, occasionally serves a response for a different coord. Reject
// any response whose returned lat/lon is more than this many metres from
// our request — that's far enough to tolerate zoom=14 feature centroids
// while still catching wrong-country responses.
const NOMINATIM_COORD_MISMATCH_THRESHOLD_M = 10_000

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
  if (cached && cached.area) return cached

  // 2. Check DB for a nearby already-geocoded record.
  // Pick the MOST RECENTLY geocoded neighbour — gives stable, reproducible
  // results and lets a corrected geocode supersede an older bad one.
  const roundedLat = parseFloat(lat.toFixed(3))
  const roundedLng = parseFloat(lng.toFixed(3))
  try {
    const existing = await db.locationEvent.findFirst({
      where: {
        latitude: { gte: roundedLat - 0.0005, lte: roundedLat + 0.0005 },
        longitude: { gte: roundedLng - 0.0005, lte: roundedLng + 0.0005 },
        geocodedCity: { not: null },
      },
      orderBy: { geocodedAt: 'desc' },
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

  // 3. Call Nominatim (single attempt with timeout — supplementary data, not worth blocking for)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&accept-language=en`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TIP-Cargo-Tracking/1.0 (tip.live)' },
      signal: AbortSignal.timeout(2000),
    })

    if (!res.ok) return null

    const data = await res.json()

    // Sanity-check: Nominatim's response must correspond to our request.
    // Under burst load its CDN occasionally serves a response keyed on a
    // different coord — which is how Warsaw events ended up geocoded as
    // "Bao'an District, China". Compare the returned lat/lon against what
    // we asked for and reject mismatches.
    const respLat = parseFloat(data.lat)
    const respLng = parseFloat(data.lon)
    if (Number.isFinite(respLat) && Number.isFinite(respLng)) {
      const distanceM = haversineDistanceM(lat, lng, respLat, respLng)
      if (distanceM > NOMINATIM_COORD_MISMATCH_THRESHOLD_M) {
        console.warn('[geocoding] rejected Nominatim mismatch', {
          request: { lat, lng },
          response: { lat: respLat, lng: respLng, display_name: data.display_name },
          distanceM: Math.round(distanceM),
        })
        return null
      }
    }

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
      address.aeroway ||
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

/**
 * Reverse-geocode a lat/lng into a one-line display-ready address, e.g.
 * "Oatlands North, Makhanda, South Africa". Returns null when the coords
 * can't be resolved (oceanic / remote / null island). Intended for enriching
 * user-supplied origin/destination records at CREATE time so the detail page
 * never has to show raw coordinates for them.
 *
 * Never throws — this is best-effort enrichment; callers should treat null
 * as "leave the address field blank and fall back to the existing display
 * logic".
 */
export async function reverseGeocodeToAddressLine(
  lat: number,
  lng: number
): Promise<string | null> {
  try {
    const geo = await reverseGeocode(lat, lng)
    if (!geo) return null
    const parts = [geo.area, geo.city, geo.country].filter((s) => s && s.length > 0)
    if (parts.length === 0) return null
    return parts.join(', ')
  } catch {
    return null
  }
}
