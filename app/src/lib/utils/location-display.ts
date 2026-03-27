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

/**
 * Thin a list of location events so that only one event per time window is kept.
 * Within each window, the latest event (by recordedAt) is retained.
 *
 * Events MUST be sorted newest-first (descending recordedAt).
 * The output preserves that sort order.
 *
 * Algorithm: walk from newest to oldest. Each kept event "claims" a window
 * stretching windowMs into the past. Any event whose recordedAt falls inside
 * that window is dropped; the next event outside it starts a new window.
 *
 * @param events  Sorted newest-first
 * @param windowMs  Window size in milliseconds (default 2 hours)
 */
export function thinToTimeWindow<T extends { recordedAt: Date }>(
  events: T[],
  windowMs = 2 * 60 * 60 * 1000,
): T[] {
  if (events.length <= 1) return events

  const result: T[] = [events[0]] // always keep the most recent
  let lastKeptTime = new Date(events[0].recordedAt).getTime()

  for (let i = 1; i < events.length; i++) {
    const t = new Date(events[i].recordedAt).getTime()
    if (lastKeptTime - t >= windowMs) {
      result.push(events[i])
      lastKeptTime = t
    }
  }

  return result
}
