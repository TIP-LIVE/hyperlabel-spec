/**
 * Shared utilities for displaying location data and "last update" timestamps.
 * Single source of truth — used across cargo, shipments, tracking, and admin pages.
 */

interface LastUpdateInput {
  /** Most recent location event's device-reported time */
  locationRecordedAt?: string | Date | null
  /** Label's lastSeenAt — updated on every webhook, even deduped/null-location */
  labelLastSeenAt?: string | Date | null
}

/**
 * Compute the "last update" timestamp as the more recent of:
 * - locationRecordedAt (device clock when location was recorded)
 * - labelLastSeenAt (server clock when any webhook was received)
 *
 * Returns the raw Date for formatting, or null if neither is available.
 */
export function getLastUpdateDate(input: LastUpdateInput): Date | null {
  const locTime = input.locationRecordedAt
    ? new Date(input.locationRecordedAt).getTime()
    : 0
  const seenTime = input.labelLastSeenAt
    ? new Date(input.labelLastSeenAt).getTime()
    : 0

  const latest = Math.max(locTime, seenTime)
  if (latest === 0) return null

  return new Date(latest)
}

/**
 * Returns the "last update" timestamp as epoch ms for table sorting.
 * Returns 0 when no data is available.
 */
export function getLastUpdateMs(input: LastUpdateInput): number {
  return getLastUpdateDate(input)?.getTime() ?? 0
}

interface LocationDisplayInput {
  geocodedCity?: string | null
  geocodedArea?: string | null
  geocodedCountry?: string | null
  geocodedCountryCode?: string | null
  latitude?: number | null
  longitude?: number | null
}

/**
 * Format a location for display: "City, Country" if geocoded,
 * otherwise "lat, lng" coordinates, or null if no data.
 */
export function formatLocationName(loc: LocationDisplayInput): string | null {
  if (loc.geocodedCity && loc.geocodedCountry) {
    return `${loc.geocodedCity}, ${loc.geocodedCountry}`
  }
  if (loc.geocodedCity) return loc.geocodedCity
  if (loc.geocodedArea && loc.geocodedCountry) {
    return `${loc.geocodedArea}, ${loc.geocodedCountry}`
  }
  if (loc.geocodedCountry) return loc.geocodedCountry
  if (loc.latitude != null && loc.longitude != null) {
    return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
  }
  return null
}

/**
 * Get the country code (for flag emoji) from a location,
 * or null if not available.
 */
export function getLocationCountryCode(loc: LocationDisplayInput): string | null {
  return loc.geocodedCountryCode ?? null
}
