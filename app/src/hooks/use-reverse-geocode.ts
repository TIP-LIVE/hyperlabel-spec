'use client'

import { useState, useEffect } from 'react'

export interface GeocodedLocation {
  name: string // "London, United Kingdom"
  country: string // "United Kingdom"
  countryCode: string // "GB"
}

// In-memory cache to avoid redundant API calls during a session
const geocodeCache = new Map<string, GeocodedLocation>()

function cacheKey(lat: number, lng: number): string {
  // Round to 3 decimal places (~111m precision) to reuse nearby lookups
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

/**
 * Reverse geocode a lat/lng to a human-readable place name.
 * Uses OpenStreetMap Nominatim (free, no API key).
 * Rate-limited to 1 request/second as per Nominatim usage policy.
 */
async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodedLocation | null> {
  const key = cacheKey(lat, lng)
  const cached = geocodeCache.get(key)
  if (cached) return cached

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

    // Build a short location name: city/town + country
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      ''
    const country = address.country || ''
    const countryCode = (address.country_code || '').toUpperCase()

    let name = ''
    if (city && country) {
      name = `${city}, ${country}`
    } else if (city) {
      name = city
    } else if (country) {
      name = country
    } else if (data.display_name) {
      // Fallback: take first 2 parts of display name
      const parts = data.display_name.split(', ')
      name = parts.slice(0, 2).join(', ')
    }

    if (name) {
      const result: GeocodedLocation = { name, country, countryCode }
      geocodeCache.set(key, result)
      return result
    }
    return null
  } catch {
    return null
  }
}

/**
 * Hook to reverse geocode a list of locations.
 * Only geocodes the first N locations to stay within rate limits.
 */
export function useReverseGeocode(
  locations: Array<{ id: string; latitude: number; longitude: number }>,
  maxLocations = 10
) {
  const [names, setNames] = useState<Record<string, GeocodedLocation>>({})

  useEffect(() => {
    if (locations.length === 0) return

    let cancelled = false
    const toGeocode = locations.slice(0, maxLocations)

    async function geocodeAll() {
      const results: Record<string, GeocodedLocation> = {}

      for (const loc of toGeocode) {
        if (cancelled) break
        const key = cacheKey(loc.latitude, loc.longitude)
        const cached = geocodeCache.get(key)

        if (cached) {
          results[loc.id] = cached
        } else {
          // Respect Nominatim rate limit: 1 req/sec
          const result = await reverseGeocode(loc.latitude, loc.longitude)
          if (result) results[loc.id] = result
          // Small delay between requests
          await new Promise((r) => setTimeout(r, 1100))
        }
      }

      if (!cancelled) {
        setNames(results)
      }
    }

    geocodeAll()

    return () => {
      cancelled = true
    }
  }, [locations, maxLocations])

  return names
}
