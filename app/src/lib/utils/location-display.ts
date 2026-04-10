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

/** ~500m at mid-latitudes (0.005 degrees). Used as proximity fallback when city is missing. */
const NEARBY_DEGREES = 0.005

interface NearbyPoint {
  latitude: number
  longitude: number
}

/** Check if two coordinates are within ~500m of each other (fallback for un-geocoded records). */
export function isNearby(a: NearbyPoint, b: NearbyPoint): boolean {
  const dlat = Math.abs(a.latitude - b.latitude)
  const dlng = Math.abs(a.longitude - b.longitude)
  return dlat < NEARBY_DEGREES && dlng < NEARBY_DEGREES
}

export interface GroupableLocation {
  recordedAt: Date
  latitude: number
  longitude: number
  geocodedCity?: string | null
}

export interface LocationGroup<T extends GroupableLocation> {
  events: T[]
  /** First (newest) event in the group. Used as the representative for display. */
  representative: T
}

/**
 * Group consecutive location events by geocoded city name.
 *
 * Events are expected to be sorted newest-first, but this function applies a
 * defensive sort first so the output is always chronologically correct. A new
 * group starts whenever the geocoded city changes. When either side is missing
 * a city name, falls back to coordinate proximity (~500m). When BOTH events
 * have city names, the city comparison is authoritative — no proximity fallback
 * — so geographically distinct named places never get silently merged under a
 * single label.
 *
 * Invariant: for any two adjacent groups N and N+1, every event in group N is
 * strictly newer than every event in group N+1. In other words, group time
 * ranges never overlap.
 */
export function groupConsecutiveByCity<T extends GroupableLocation>(
  locations: T[],
): LocationGroup<T>[] {
  if (locations.length === 0) return []

  // Defensive sort: newest-first by recordedAt. Callers should already pass
  // sorted input, but relying on that was the source of earlier chronology bugs.
  const sorted = [...locations].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  )

  const groups: LocationGroup<T>[] = []
  let current: LocationGroup<T> = { events: [sorted[0]], representative: sorted[0] }

  for (let i = 1; i < sorted.length; i++) {
    const prev = current.representative
    const curr = sorted[i]

    // Strict city matching: if both events carry a city name, that comparison
    // wins. Proximity is only a fallback for events that haven't been geocoded.
    const sameGroup =
      prev.geocodedCity && curr.geocodedCity
        ? prev.geocodedCity === curr.geocodedCity
        : isNearby(prev, curr)

    if (sameGroup) {
      current.events.push(curr)
    } else {
      groups.push(current)
      current = { events: [curr], representative: curr }
    }
  }
  groups.push(current)
  return groups
}

/**
 * Thin events within each location group while always preserving the newest
 * (first) and oldest (last) events so the group's date range is never lost.
 *
 * Use this AFTER `groupConsecutiveByCity` to reduce display clutter without
 * destroying time range information. Previous approach (thin → group) could
 * reduce multi-event groups to single events, making date ranges disappear.
 */
export function thinGroupEvents<T extends GroupableLocation>(
  groups: LocationGroup<T>[],
  windowMs = 2 * 60 * 60 * 1000,
): LocationGroup<T>[] {
  return groups.map((group) => {
    if (group.events.length <= 2) return group

    // thinToTimeWindow always preserves the newest (index 0).
    // We must also guarantee the oldest survives for the date range.
    const thinned = thinToTimeWindow(group.events, windowMs)

    const oldest = group.events[group.events.length - 1]
    if (thinned[thinned.length - 1] !== oldest) {
      thinned.push(oldest)
    }

    return { events: thinned, representative: thinned[0] }
  })
}
