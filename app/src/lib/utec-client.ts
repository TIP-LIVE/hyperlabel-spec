/**
 * Client for label.utec.ua GPS Tracking API.
 *
 * label.utec.ua is the device-team backend that receives firmware data
 * (via TCP listener and Onomondo puller) including battery voltage.
 *
 * Authentication: non-expiring JWT issued by their /auth/google endpoint.
 * The JWT payload is { sub, email } — no exp claim — so a single login
 * yields a token that works forever until JWT_SECRET_KEY is rotated.
 *
 * We only use this client to backfill battery percentage. All location
 * data continues to flow via Onomondo's location-update webhook.
 *
 * Source: https://github.com/gps-tracker-org/gps-device-tracker
 */

const BASE_URL = process.env.UTEC_API_URL || 'https://label.utec.ua/api'

export interface UtecDevice {
  id: number
  iccid: string | null
  imei: string | null
  user_device_name?: string | null
  fw_version?: string | null
  hw_version?: string | null
}

export interface UtecDeviceData {
  iccid: string | null
  imei: string | null
  fw_version: string | null
  hw_version: string | null
  latitude: number | null
  longitude: number | null
  timestamp: string | null
  battery: number | null
  rssi: number | null
  source: string | null
}

export class UtecAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UtecAuthError'
  }
}

async function utecFetch(path: string, token: string): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    // Short timeout — if label.utec.ua is slow, skip this run and retry next cron
    signal: AbortSignal.timeout(10_000),
  })
  if (res.status === 401 || res.status === 403) {
    throw new UtecAuthError(
      `label.utec.ua auth failed (${res.status}). Check UTEC_API_TOKEN env var.`
    )
  }
  return res
}

/**
 * List all devices visible to the authenticated user.
 * label.utec.ua uses an integer `id` as the primary key — we need to
 * build an iccid → id map before we can fetch per-device data.
 */
export async function listUtecDevices(token: string): Promise<UtecDevice[]> {
  const res = await utecFetch('/devices/', token)
  if (!res.ok) {
    throw new Error(`listUtecDevices failed: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

/**
 * Fetch the latest data point for a single device.
 * DeviceDataOut includes battery (already converted from voltage to 0-100 by
 * their backend via voltage_to_percentage() in tip_forwarder.py).
 */
export async function getUtecLatest(
  token: string,
  deviceId: number
): Promise<UtecDeviceData | null> {
  const res = await utecFetch(`/devices/${deviceId}`, token)
  if (!res.ok) {
    if (res.status === 404) return null
    throw new Error(
      `getUtecLatest(${deviceId}) failed: ${res.status} ${await res.text()}`
    )
  }
  return res.json()
}

/**
 * Build an iccid → utec device id map.
 * Call once per cron run, then batch per-device lookups.
 */
export function indexByIccid(devices: UtecDevice[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const d of devices) {
    if (d.iccid) map.set(d.iccid, d.id)
  }
  return map
}
