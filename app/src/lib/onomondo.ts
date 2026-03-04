const ONOMONDO_API_BASE = 'https://api.onomondo.com'

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
