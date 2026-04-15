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
  /** When the last geocoding attempt ran. Null = never tried yet (pending). */
  geocodedAt?: Date | string | null
  latitude?: number | null
  longitude?: number | null
}

/**
 * Tri-state display result so UI can show "Locating…" for pending events
 * instead of raw coords (which almost always means "geocoder hasn't run yet"
 * for <5-minute-old events).
 *
 *  - geocoded: Nominatim matched a place.
 *  - pending:  geocoder hasn't attempted yet (or the row pre-dates the
 *              geocodedAt column and needs backfill).
 *  - failed:   geocoder attempted but returned null (remote / ocean /
 *              permanently unresolvable coords). UI falls back to coords.
 *  - empty:    no coordinates available at all.
 */
export type LocationDisplay =
  | { state: 'geocoded'; text: string; countryCode: string | null }
  | { state: 'pending'; coords: string | null }
  | { state: 'failed'; coords: string | null }
  | { state: 'empty' }

function formatCoords(loc: LocationDisplayInput): string | null {
  if (loc.latitude == null || loc.longitude == null) return null
  return `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
}

/**
 * Resolve a LocationEvent into a display-ready value. See `LocationDisplay`
 * for the state machine.
 */
export function resolveLocationDisplay(loc: LocationDisplayInput): LocationDisplay {
  if (loc.geocodedCity || loc.geocodedCountry || loc.geocodedArea) {
    let text: string | null = null
    if (loc.geocodedCity && loc.geocodedCountry) {
      text = `${loc.geocodedCity}, ${loc.geocodedCountry}`
    } else if (loc.geocodedCity) {
      text = loc.geocodedCity
    } else if (loc.geocodedArea && loc.geocodedCountry) {
      text = `${loc.geocodedArea}, ${loc.geocodedCountry}`
    } else if (loc.geocodedCountry) {
      text = loc.geocodedCountry
    }
    if (text) {
      return { state: 'geocoded', text, countryCode: loc.geocodedCountryCode ?? null }
    }
  }

  const coords = formatCoords(loc)
  if (loc.geocodedAt) {
    // Attempted but no result — show coords as the "failed" fallback.
    return { state: 'failed', coords }
  }
  if (coords == null) return { state: 'empty' }
  return { state: 'pending', coords }
}

/**
 * Back-compat wrapper: returns just the display text ("City, Country" or
 * coord string), or null if neither is available. Existing call sites that
 * don't care about pending/failed state keep working unchanged.
 */
export function formatLocationName(loc: LocationDisplayInput): string | null {
  const display = resolveLocationDisplay(loc)
  if (display.state === 'geocoded') return display.text
  if (display.state === 'pending' || display.state === 'failed') return display.coords
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
  geocodedArea?: string | null
}

export interface LocationGroup<T extends GroupableLocation> {
  events: T[]
  /** First (newest) event in the group. Used as the representative for display. */
  representative: T
}

/**
 * Generic consecutive grouping by an arbitrary key field.
 *
 * Applies a defensive newest-first sort, then walks events sequentially.
 * A new group starts whenever the key changes. When either side is missing
 * a key, falls back to coordinate proximity (~500m). When BOTH events
 * have keys, the string comparison is authoritative — no proximity fallback
 * — so distinct named places never get silently merged.
 *
 * Invariant: for any two adjacent groups N and N+1, every event in group N is
 * strictly newer than every event in group N+1 (no time-range overlap).
 */
function groupConsecutive<T extends GroupableLocation>(
  locations: T[],
  getKey: (loc: T) => string | null | undefined,
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

    const key1 = getKey(prev)
    const key2 = getKey(curr)
    // Strict key matching: if both events carry a key, that comparison wins.
    // Proximity is only a fallback for events that haven't been geocoded.
    const sameGroup =
      key1 && key2
        ? key1 === key2
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
 * Group consecutive location events by geocoded city name.
 *
 * A new group starts whenever the geocoded city changes. When either side is
 * missing a city name, falls back to coordinate proximity (~500m). When BOTH
 * events have city names, the city comparison is authoritative — no proximity
 * fallback — so geographically distinct named places never get silently merged
 * under a single label.
 */
export function groupConsecutiveByCity<T extends GroupableLocation>(
  locations: T[],
): LocationGroup<T>[] {
  return groupConsecutive(locations, (l) => l.geocodedCity)
}

/**
 * Group consecutive location events by geocoded area/suburb name.
 *
 * Same algorithm as city grouping but keyed on geocodedArea. Useful for
 * showing movement patterns within a city when expanding a city-level group.
 * Unlike the old `groupByArea` (which merged ALL same-area events globally),
 * this preserves temporal order so the user can see when the device moved
 * between areas.
 */
export function groupConsecutiveByArea<T extends GroupableLocation>(
  locations: T[],
): LocationGroup<T>[] {
  return groupConsecutive(locations, (l) => l.geocodedArea)
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
