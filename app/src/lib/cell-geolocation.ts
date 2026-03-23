/**
 * Resolve cell tower coordinates via Google Geolocation API.
 * Used as a fallback when Onomondo Location Update webhooks
 * return null lat/lng but include cell tower identifiers.
 *
 * @see https://developers.google.com/maps/documentation/geolocation/overview
 */

const GOOGLE_GEOLOCATION_URL =
  'https://www.googleapis.com/geolocation/v1/geolocate'

export interface CellTowerLocation {
  lat: number
  lng: number
  accuracyM: number
}

// In-memory cache keyed by "mcc:mnc:lac:cid" — cell towers don't move
const cache = new Map<string, CellTowerLocation | null>()

function cacheKey(
  mcc: number,
  mnc: number,
  lac: number | null,
  cid: number
): string {
  return `${mcc}:${mnc}:${lac ?? '?'}:${cid}`
}

/**
 * Resolve a cell tower's geographic coordinates using Google Geolocation API.
 *
 * @param mcc Mobile Country Code
 * @param mnc Mobile Network Code
 * @param lac Location Area Code (nullable — API can still resolve with just mcc/mnc)
 * @param cid Cell ID
 * @param radioType Radio type hint (e.g. 'gsm', 'lte', 'wcdma') — improves accuracy
 * @returns Resolved location or null if resolution fails
 */
export async function resolveCellTowerLocation(
  mcc: number,
  mnc: number,
  lac: number | null,
  cid: number,
  radioType?: string
): Promise<CellTowerLocation | null> {
  const key = cacheKey(mcc, mnc, lac, cid)
  if (cache.has(key)) return cache.get(key) ?? null

  const apiKey =
    process.env.GOOGLE_GEOLOCATION_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn(
      '[Cell geolocation] No Google API key set, skipping'
    )
    return null
  }

  try {
    // Without a cell ID, Google can only resolve to country level —
    // which Onomondo already provides. Skip the API call.
    if (!cid) {
      cache.set(key, null)
      return null
    }

    const cellTower: Record<string, number | string> = {
      mobileCountryCode: mcc,
      mobileNetworkCode: mnc,
      cellId: cid,
    }
    if (lac !== null) cellTower.locationAreaCode = lac
    if (radioType) cellTower.radioType = radioType.toLowerCase()

    const body: Record<string, unknown> = {
      homeMobileCountryCode: mcc,
      homeMobileNetworkCode: mnc,
      cellTowers: [cellTower],
    }
    if (radioType) body.radioType = radioType.toLowerCase()

    const res = await fetch(`${GOOGLE_GEOLOCATION_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text()
      console.warn(
        `[Cell geolocation] Google API ${res.status}: ${text.slice(0, 200)}`
      )
      cache.set(key, null)
      return null
    }

    const data = await res.json()
    if (!data.location?.lat || !data.location?.lng) {
      cache.set(key, null)
      return null
    }

    const result: CellTowerLocation = {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracyM: Math.round(data.accuracy ?? 1000),
    }

    cache.set(key, result)
    return result
  } catch (err) {
    console.warn('[Cell geolocation] request failed:', err)
    cache.set(key, null)
    return null
  }
}
