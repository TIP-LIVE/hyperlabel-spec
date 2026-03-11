import { z } from 'zod'

/**
 * Schema for incoming device location reports.
 * Handles data from the label devices (via label.utec.ua or direct).
 *
 * Accepts deviceId directly OR imei/iccid for automatic lookup.
 * At least one of deviceId, imei, or iccid must be provided.
 */
export const deviceReportSchema = z.object({
  // Device identifier — at least one of deviceId/imei/iccid required
  deviceId: z.string().min(1).optional(),
  imei: z.string().min(1).optional(),
  iccid: z.string().min(1).optional(),

  // Location coordinates (cell tower triangulation via Onomondo)
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),

  // Optional location metadata
  accuracy: z.number().positive().optional(), // meters
  altitude: z.number().optional(),
  speed: z.number().min(0).optional(), // m/s

  // Device status
  battery: z.number().min(0).max(100).optional(),

  // Timestamp when the device recorded the location
  recordedAt: z.string().datetime({ offset: true }).optional(),

  // Cell tower backup location (from Onomondo)
  cellLatitude: z.number().min(-90).max(90).optional(),
  cellLongitude: z.number().min(-180).max(180).optional(),

  // Flag for offline-synced data
  isOfflineSync: z.boolean().optional().default(false),
}).refine(
  (data) => data.deviceId || data.imei || data.iccid,
  { message: 'At least one of deviceId, imei, or iccid is required' }
)

export type DeviceReportInput = z.infer<typeof deviceReportSchema>

/**
 * Check if coordinates are null island (0, 0).
 */
export function isNullIsland(lat: number, lng: number): boolean {
  return lat === 0 && lng === 0
}

/**
 * Validate and clean location data.
 * Filters out invalid coordinates (0,0 null island, etc.)
 */
export function validateLocation(lat: number, lng: number): boolean {
  if (isNullIsland(lat, lng)) {
    return false
  }

  // Check valid ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return false
  }
  
  // Check for NaN or Infinity
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false
  }
  
  return true
}

/**
 * Schema for label activation via QR scan.
 */
export const activateLabelSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  // Optional: link to existing shipment
  shipmentId: z.string().optional(),
})

export type ActivateLabelInput = z.infer<typeof activateLabelSchema>

/**
 * Schema for registering existing tracking labels to the current organisation.
 * Device IDs are normalized (trimmed, optional HL- prefix).
 */
export const registerLabelsSchema = z.object({
  deviceIds: z
    .array(z.string().min(1, 'Device ID is required'))
    .min(1, 'At least one device ID is required')
    .max(100, 'Maximum 100 labels per request'),
})

export type RegisterLabelsInput = z.infer<typeof registerLabelsSchema>

/**
 * Schema for Onomondo HTTPS connector payloads.
 * This is the DeviceDataOut format from firmware, forwarded by Onomondo's HTTPS connector.
 */
export const onomondoConnectorSchema = z.object({
  iccid: z.string().min(1),
  imei: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestamp: z.string(),
  onomondo_latitude: z.number().min(-90).max(90).optional(),
  onomondo_longitude: z.number().min(-180).max(180).optional(),
  battery: z.number().min(0).max(100).optional(),
  signal_strength: z.number().optional(),
  offline_queue: z
    .array(
      z.object({
        timestamp: z.string(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
        battery_pct: z.number().min(0).max(100).optional(),
      })
    )
    .optional()
    .default([]),
})

export type OnomonodoConnectorInput = z.infer<typeof onomondoConnectorSchema>

/**
 * Schema for Onomondo Location Update webhook payload.
 * Fires on every cell tower change. lat/lng can be null when location
 * cannot be determined.
 */
export const onomondoLocationUpdateSchema = z.object({
  type: z.literal('location'),
  imei: z.string().min(1),
  iccid: z.string().min(1),
  sim_id: z.string(),
  location: z.object({
    cell_id: z.number(),
    location_area_code: z.number().nullable(),
    accuracy: z.number().nullable(),
    lat: z.string().nullable(),
    lng: z.string().nullable(),
  }),
  network: z.object({
    name: z.string(),
    country: z.string(),
    country_code: z.string(),
    mcc: z.string(),
    mnc: z.string(),
  }),
  network_type: z.string(),
  sim_label: z.string(),
  time: z.string(),
  ipv4: z.string(),
  session_id: z.string(),
})

export type OnomonodoLocationUpdateInput = z.infer<typeof onomondoLocationUpdateSchema>
