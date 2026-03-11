const ONOMONDO_API_BASE = 'https://api.onomondo.com'

// ============================================
// Types
// ============================================

export interface OnomonodoSim {
  id: string
  iccid: string
  label: string
  online: boolean
  activated: boolean
  created_at: string
}

export interface OnomonodoUsageEntry {
  time: string
  sim_id: string
  iccid: string
  bytes: number
  network_type: string
  network: { country: string; mcc: string; mnc: string }
}

export interface OnomonodoSimLocation {
  lat: number
  lng: number
  accuracy: number
  time: string
}

// ============================================
// Helpers
// ============================================

function getHeaders(): Record<string, string> {
  const apiKey = process.env.ONOMONDO_API_KEY
  if (!apiKey) throw new Error('ONOMONDO_API_KEY not set')
  return {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  }
}

// Simple in-memory cache for Onomondo API responses
const cache = new Map<string, { data: unknown; expiresAt: number }>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && entry.expiresAt > Date.now()) return entry.data as T
  cache.delete(key)
  return null
}

function setCache(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs })
}

// ============================================
// Read API
// ============================================

/**
 * Fetch all SIMs from Onomondo. Cached for 60 seconds.
 */
export async function getOnomonodoSims(): Promise<OnomonodoSim[]> {
  const cached = getCached<OnomonodoSim[]>('sims:all')
  if (cached) return cached

  const headers = getHeaders()
  const res = await fetch(`${ONOMONDO_API_BASE}/sims?limit=1000`, { headers })
  if (!res.ok) {
    console.warn(`[Onomondo] Failed to fetch SIMs: ${res.status}`)
    return []
  }
  const sims = await res.json()
  const result = Array.isArray(sims) ? sims : []
  setCache('sims:all', result, 60_000)
  return result
}

/**
 * Find a single SIM by ICCID. Cached for 60 seconds.
 */
export async function getOnomonodoSimByIccid(iccid: string): Promise<OnomonodoSim | null> {
  const cacheKey = `sim:${iccid}`
  const cached = getCached<OnomonodoSim | null>(cacheKey)
  if (cached !== null) return cached

  const headers = getHeaders()
  const res = await fetch(
    `${ONOMONDO_API_BASE}/sims/find?search=${encodeURIComponent(iccid)}&limit=1`,
    { headers },
  )
  if (!res.ok) {
    console.warn(`[Onomondo] Failed to search SIM by ICCID ${iccid}: ${res.status}`)
    return null
  }
  const sims = await res.json()
  const sim = Array.isArray(sims) && sims.length > 0 ? sims[0] : null
  setCache(cacheKey, sim, 60_000)
  return sim
}

/**
 * Fetch data usage for a specific SIM. Cached for 5 minutes.
 */
export async function getOnomonodoUsage(simId: string): Promise<OnomonodoUsageEntry[]> {
  const cacheKey = `usage:${simId}`
  const cached = getCached<OnomonodoUsageEntry[]>(cacheKey)
  if (cached) return cached

  const headers = getHeaders()
  const res = await fetch(`${ONOMONDO_API_BASE}/usage/${simId}`, { headers })
  if (!res.ok) {
    console.warn(`[Onomondo] Failed to fetch usage for SIM ${simId}: ${res.status}`)
    return []
  }
  const usage = await res.json()
  const result = Array.isArray(usage) ? usage : []
  setCache(cacheKey, result, 300_000)
  return result
}

/**
 * Fetch the last known location for a SIM by its Onomondo ID.
 * Requires Fleet package on the Onomondo plan.
 * The location field is optional and only present if available.
 * NOT cached — always returns the freshest data for polling use.
 */
export async function getSimLocation(
  simId: string
): Promise<OnomonodoSimLocation | null> {
  const headers = getHeaders()
  const res = await fetch(`${ONOMONDO_API_BASE}/sims/${simId}`, { headers })
  if (!res.ok) {
    console.warn(`[Onomondo] Failed to fetch SIM ${simId}: ${res.status}`)
    return null
  }

  const data = await res.json()
  const loc = data?.location
  if (!loc || loc.lat == null || loc.lng == null) {
    console.warn(`[Onomondo] SIM ${simId} has no location data`, {
      hasLocation: !!loc,
      online: data?.online ?? null,
      lastOnline: data?.last_online ?? null,
    })
    return null
  }

  const timeSource = loc.time ? 'location.time' : data.last_online ? 'last_online' : 'now'
  if (timeSource !== 'location.time') {
    console.warn(`[Onomondo] SIM ${simId} location time fallback to ${timeSource}`)
  }

  return {
    lat: typeof loc.lat === 'string' ? parseFloat(loc.lat) : loc.lat,
    lng: typeof loc.lng === 'string' ? parseFloat(loc.lng) : loc.lng,
    accuracy: loc.accuracy ?? 1000,
    time: loc.time ?? data.last_online ?? new Date().toISOString(),
  }
}

// ============================================
// Write API
// ============================================

/**
 * Sync the internal deviceId as the SIM label in Onomondo,
 * so SIMs are easy to identify in the Onomondo dashboard.
 *
 * Looks up the SIM by ICCID, then sets its label to the deviceId.
 * Fire-and-forget — failures are logged but never block ingest.
 */
export async function syncSimLabelToOnomondo(
  iccid: string,
  deviceId: string
): Promise<void> {
  const apiKey = process.env.ONOMONDO_API_KEY
  if (!apiKey) {
    console.warn('[Onomondo] ONOMONDO_API_KEY not set, skipping label sync')
    return
  }

  const headers = {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  }

  // Find the SIM by ICCID to get its Onomondo sim_id
  const searchRes = await fetch(
    `${ONOMONDO_API_BASE}/sims/find?search=${encodeURIComponent(iccid)}&limit=1`,
    { headers }
  )

  if (!searchRes.ok) {
    console.warn(
      `[Onomondo] Failed to search SIM by ICCID ${iccid}: ${searchRes.status}`
    )
    return
  }

  const sims = await searchRes.json()
  if (!Array.isArray(sims) || sims.length === 0) {
    console.warn(`[Onomondo] No SIM found for ICCID ${iccid}`)
    return
  }

  const simId = sims[0].id

  // Update the SIM label
  const patchRes = await fetch(`${ONOMONDO_API_BASE}/sims/${simId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ label: deviceId }),
  })

  if (!patchRes.ok) {
    console.warn(
      `[Onomondo] Failed to update label for SIM ${simId}: ${patchRes.status}`
    )
    return
  }

  console.info(
    `[Onomondo] Synced label "${deviceId}" to SIM ${simId} (ICCID ${iccid})`
  )
}
