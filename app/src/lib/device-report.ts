import { db } from '@/lib/db'
import { validateLocation } from '@/lib/validations/device'
import { reverseGeocode } from '@/lib/geocoding'
import {
  sendShipmentDeliveredNotification,
  sendConsigneeInTransitNotification,
  sendConsigneeDeliveredNotification,
  sendLabelOrphanedNotification,
} from '@/lib/notifications'
import { format } from 'date-fns'
import { syncSimLabelToOnomondo } from '@/lib/onomondo'
import { generateShareCode } from '@/lib/utils/share-code'

/** Input shape for the shared location report processing logic. */
export interface LocationReportInput {
  deviceId?: string
  imei?: string
  iccid?: string

  latitude?: number
  longitude?: number

  accuracy?: number
  altitude?: number
  speed?: number
  battery?: number

  recordedAt?: string

  cellLatitude?: number
  cellLongitude?: number

  isOfflineSync?: boolean
  source?: 'GPS' | 'CELL_TOWER'

  /** Skip reverse geocoding (caller will handle it asynchronously). */
  skipGeocode?: boolean
}

export interface LocationReportResult {
  success: boolean
  locationId: string
  shipmentId: string | null
  deviceId: string
}

export class LocationReportError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message)
    this.name = 'LocationReportError'
  }
}

/**
 * Process a single location report.
 * Shared by /device/report and /device/onomondo endpoints.
 */
export async function processLocationReport(
  input: LocationReportInput
): Promise<LocationReportResult> {
  // Resolve effective coordinates — for CELL_TOWER source, primary lat/lng
  // may not be provided, so fall back to cell tower coords
  const effectiveLat = input.latitude ?? input.cellLatitude
  const effectiveLng = input.longitude ?? input.cellLongitude

  if (effectiveLat === undefined || effectiveLng === undefined) {
    throw new LocationReportError(
      'No coordinates provided',
      400,
      'Either latitude/longitude or cellLatitude/cellLongitude must be provided'
    )
  }

  // Validate coordinates
  if (!validateLocation(effectiveLat, effectiveLng)) {
    throw new LocationReportError(
      'Invalid coordinates',
      400,
      'Location appears to be null island or invalid'
    )
  }

  const isCellTowerOnly = input.source === 'CELL_TOWER'

  // Shipment select fields (reused for all lookup strategies)
  const shipmentSelect = {
    id: true,
    name: true,
    status: true,
    shareCode: true,
    userId: true,
    originAddress: true,
    destinationAddress: true,
    destinationLat: true,
    destinationLng: true,
    consigneeEmail: true,
  }

  // Include recently delivered shipments (1h grace) so late-arriving
  // location reports from offline buffers still get associated.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const activeShipmentWhere = {
    OR: [
      {
        status: {
          in: ['PENDING', 'IN_TRANSIT'] as ['PENDING', 'IN_TRANSIT'],
        },
      },
      { status: 'DELIVERED' as const, deliveredAt: { gte: oneHourAgo } },
    ],
  }
  const shipmentInclude = {
    shipments: {
      where: activeShipmentWhere,
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: shipmentSelect,
    },
    shipmentLabels: {
      where: { shipment: activeShipmentWhere },
      include: {
        shipment: { select: shipmentSelect },
      },
      take: 1,
    },
  }

  // Find the label by deviceId, IMEI, or ICCID.
  // When IMEI finds a label without an active shipment, continue checking
  // ICCID — the SIM may have moved to a different device whose label IS
  // linked to the current shipment.
  let label = input.deviceId
    ? await db.label.findUnique({
        where: { deviceId: input.deviceId },
        include: shipmentInclude,
      })
    : null

  if (!label && input.imei) {
    label = await db.label.findFirst({
      where: { imei: input.imei },
      include: shipmentInclude,
    })
  }

  // If IMEI matched a label but it has no active shipment, try ICCID too —
  // the SIM card (ICCID) is a more reliable identifier for the current device.
  const imeiLabelHasNoShipment =
    label && !label.shipments[0] && !label.shipmentLabels[0]
  if ((!label || imeiLabelHasNoShipment) && input.iccid) {
    const iccidLabel = await db.label.findFirst({
      where: { iccid: input.iccid },
      include: shipmentInclude,
    })
    if (iccidLabel) {
      // Prefer the ICCID label if it has an active shipment, or if no label was found by IMEI
      if (!label || iccidLabel.shipments[0] || iccidLabel.shipmentLabels[0]) {
        label = iccidLabel
      }
    }
  }

  // Auto-register: if no label found but IMEI/ICCID provided, create one
  if (!label && (input.imei || input.iccid)) {
    const nextDeviceId = await generateNextDeviceId()
    const newLabel = await db.label.create({
      data: {
        deviceId: nextDeviceId,
        imei: input.imei || null,
        iccid: input.iccid || null,
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
      include: shipmentInclude,
    })
    label = newLabel
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] auto-registered new label', {
        deviceId: nextDeviceId,
        imei: input.imei ?? null,
        iccid: input.iccid ?? null,
      })

      // Sync deviceId as SIM label in Onomondo dashboard (fire-and-forget)
      if (input.iccid) {
        syncSimLabelToOnomondo(input.iccid, nextDeviceId).catch((err) =>
          console.warn('[Onomondo] label sync failed:', err)
        )
      }
    }
  }

  if (!label) {
    throw new LocationReportError('Device not found', 404)
  }

  // Get the active shipment (if any)
  const activeShipment =
    label.shipments[0] || label.shipmentLabels[0]?.shipment

  if (process.env.NODE_ENV !== 'test') {
    console.info('[Device report] resolved', {
      deviceId: label.deviceId,
      labelId: label.id,
      shipmentId: activeShipment?.id ?? null,
      shipmentStatus: activeShipment?.status ?? null,
      source: input.source ?? 'GPS',
    })
  }

  // Detect orphaned device activity: label is reporting but has no shipment
  // Generate a claim token so the shipper can create a shipment via a public link
  if (!activeShipment && !label.claimToken && label.status === 'SOLD') {
    const claimToken = generateShareCode()
    const claimExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h window

    await db.label.update({
      where: { id: label.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        claimToken,
        claimExpiresAt,
        firstUnlinkedReportAt: new Date(),
      },
    })

    // Notify the label purchaser (fire-and-forget)
    sendLabelOrphanedNotification({
      labelId: label.id,
      deviceId: label.deviceId,
      claimToken,
      latitude: effectiveLat,
      longitude: effectiveLng,
    }).catch((err) =>
      console.error('Failed to send label orphaned notification:', err)
    )

    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] orphaned activity detected, claim token generated', {
        deviceId: label.deviceId,
        claimToken,
        claimExpiresAt: claimExpiresAt.toISOString(),
      })
    }
  }

  // Parse recorded timestamp or use current time
  const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date()
  const receivedAt = new Date()

  // Auto-detect offline sync: if recorded time is > 5 min before receive, it's offline
  const OFFLINE_SYNC_THRESHOLD_MS = 5 * 60 * 1000
  const isOfflineSync =
    input.isOfflineSync === true
      ? true
      : receivedAt.getTime() - recordedAt.getTime() > OFFLINE_SYNC_THRESHOLD_MS

  // Deduplicate: skip if an identical event already exists (e.g. Onomondo double-send)
  const existingDuplicate = await db.locationEvent.findFirst({
    where: {
      labelId: label.id,
      recordedAt,
      latitude: effectiveLat,
      longitude: effectiveLng,
      source: input.source ?? 'GPS',
    },
    select: { id: true, shipmentId: true },
  })

  if (existingDuplicate) {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] duplicate event skipped', {
        deviceId: label.deviceId,
        existingId: existingDuplicate.id,
        recordedAt: recordedAt.toISOString(),
      })
    }
    return {
      success: true,
      locationId: existingDuplicate.id,
      shipmentId: existingDuplicate.shipmentId,
      deviceId: label.deviceId,
    }
  }

  if (process.env.NODE_ENV !== 'test') {
    console.info('[Device report] storing location', {
      deviceId: label.deviceId,
      shipmentId: activeShipment?.id ?? null,
      recordedAt: recordedAt.toISOString(),
    })
  }

  const locationEvent = await db.locationEvent.create({
    data: {
      labelId: label.id,
      shipmentId: activeShipment?.id || null,
      latitude: effectiveLat,
      longitude: effectiveLng,
      accuracyM: input.accuracy ? Math.round(input.accuracy) : null,
      altitude: input.altitude,
      speed: input.speed,
      batteryPct: input.battery,
      recordedAt,
      receivedAt,
      isOfflineSync,
      cellLatitude: input.cellLatitude ?? (isCellTowerOnly ? effectiveLat : null),
      cellLongitude: input.cellLongitude ?? (isCellTowerOnly ? effectiveLng : null),
      source: input.source ?? 'GPS',
    },
  })

  // Backfill any orphaned locations from this label that pre-date the shipment
  if (activeShipment) {
    db.locationEvent.updateMany({
      where: { labelId: label.id, shipmentId: null, id: { not: locationEvent.id } },
      data: { shipmentId: activeShipment.id },
    }).then((r) => {
      if (r.count > 0) {
        console.info(`[Device report] backfilled ${r.count} orphaned locations for ${label.deviceId}`)
      }
    }).catch((err) => {
      console.warn(`[Device report] backfill failed for ${label.deviceId}:`, err)
    })
  }

  // Reverse-geocode the location and persist on the record
  if (!input.skipGeocode) {
    try {
      const geo = await reverseGeocode(effectiveLat, effectiveLng)
      if (geo) {
        await db.locationEvent.update({
          where: { id: locationEvent.id },
          data: {
            geocodedCity: geo.city,
            geocodedArea: geo.area,
            geocodedCountry: geo.country,
            geocodedCountryCode: geo.countryCode,
          },
        })
      }
    } catch (err) {
      // Geocoding failure should never block location ingest
      console.warn('[Device report] geocoding failed:', err)
    }
  }

  // Update label: lastSeenAt only if newer (prevents regression from
  // out-of-order cell tower events), battery if provided
  const labelUpdateData: Record<string, unknown> = {}
  if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
    labelUpdateData.lastSeenAt = receivedAt
  }
  if (input.battery !== undefined) {
    labelUpdateData.batteryPct = input.battery
  }
  if (Object.keys(labelUpdateData).length > 0) {
    await db.label.update({
      where: { id: label.id },
      data: labelUpdateData,
    })
  }

  // If shipment is PENDING and we received first location, update to IN_TRANSIT
  if (activeShipment && activeShipment.status === 'PENDING') {
    await db.shipment.update({
      where: { id: activeShipment.id },
      data: { status: 'IN_TRANSIT' },
    })
    console.info(`[Device report] shipment ${activeShipment.id} status: PENDING → IN_TRANSIT (${label.deviceId})`)

    if (activeShipment.consigneeEmail) {
      sendConsigneeInTransitNotification({
        consigneeEmail: activeShipment.consigneeEmail,
        shipmentName: activeShipment.name || 'Shipment',
        shareCode: activeShipment.shareCode,
        originAddress: activeShipment.originAddress,
        destinationAddress: activeShipment.destinationAddress,
      }).catch((err) =>
        console.error(
          'Failed to send consignee in-transit notification:',
          err
        )
      )
    }
  }

  // Check for delivery (if within geofence of destination)
  // Threshold is 1500m because location is cell tower triangulation (~500-1000m accuracy).
  const DELIVERY_THRESHOLD_M = 1500
  const shouldCheckDelivery =
    !input.accuracy || input.accuracy <= DELIVERY_THRESHOLD_M

  if (
    shouldCheckDelivery &&
    activeShipment &&
    activeShipment.status === 'IN_TRANSIT' &&
    activeShipment.destinationLat &&
    activeShipment.destinationLng
  ) {
    const distance = calculateDistance(
      effectiveLat,
      effectiveLng,
      activeShipment.destinationLat,
      activeShipment.destinationLng
    )

    if (distance <= DELIVERY_THRESHOLD_M) {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
      const recentLocations = await db.locationEvent.findMany({
        where: {
          shipmentId: activeShipment.id,
          recordedAt: { gte: thirtyMinAgo },
        },
        orderBy: { recordedAt: 'desc' },
      })

      const allNearDestination =
        recentLocations.length >= 2 &&
        recentLocations.every((loc) => {
          const d = calculateDistance(
            loc.latitude,
            loc.longitude,
            activeShipment.destinationLat!,
            activeShipment.destinationLng!
          )
          return d <= DELIVERY_THRESHOLD_M
        })

      if (allNearDestination) {
        await db.shipment.update({
          where: { id: activeShipment.id },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        })
        console.info(`[Device report] shipment ${activeShipment.id} status: IN_TRANSIT → DELIVERED (${label.deviceId}, distance=${Math.round(distance)}m)`)

        sendShipmentDeliveredNotification({
          userId: activeShipment.userId,
          shipmentName: activeShipment.name || 'Unnamed Shipment',
          deviceId: label.deviceId,
          shareCode: activeShipment.shareCode,
          destination:
            activeShipment.destinationAddress || 'Destination',
        }).catch((err) =>
          console.error('Failed to send delivery notification:', err)
        )

        if (activeShipment.consigneeEmail) {
          sendConsigneeDeliveredNotification({
            consigneeEmail: activeShipment.consigneeEmail,
            shipmentName: activeShipment.name || 'Shipment',
            shareCode: activeShipment.shareCode,
            destinationAddress: activeShipment.destinationAddress,
            deliveredAt: format(new Date(), 'PPpp'),
          }).catch((err) =>
            console.error(
              'Failed to send consignee delivery notification:',
              err
            )
          )
        }
      }
    }
  }

  return {
    success: true,
    locationId: locationEvent.id,
    shipmentId: activeShipment?.id || null,
    deviceId: label.deviceId,
  }
}

/**
 * Geocode a previously-created LocationEvent.
 * Intended to be called from after() so geocoding doesn't block the webhook response.
 */
export async function geocodeLocationEvent(
  locationId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    const geo = await reverseGeocode(latitude, longitude)
    if (geo) {
      await db.locationEvent.update({
        where: { id: locationId },
        data: {
          geocodedCity: geo.city,
          geocodedArea: geo.area,
          geocodedCountry: geo.country,
          geocodedCountryCode: geo.countryCode,
        },
      })
    }
  } catch (err) {
    console.warn('[Device report] deferred geocoding failed:', err)
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in meters.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Generate the next sequential TIP device ID (TIP-001, TIP-002, ...).
 */
async function generateNextDeviceId(): Promise<string> {
  const latest = await db.label.findFirst({
    where: { deviceId: { startsWith: 'TIP-' } },
    orderBy: { deviceId: 'desc' },
    select: { deviceId: true },
  })

  let nextNum = 1
  if (latest) {
    const match = latest.deviceId.match(/^TIP-(\d+)$/)
    if (match) {
      nextNum = parseInt(match[1], 10) + 1
    }
  }

  return `TIP-${String(nextNum).padStart(3, '0')}`
}
