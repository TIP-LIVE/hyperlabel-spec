import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { validateLocation } from '@/lib/validations/device'
import { reverseGeocode } from '@/lib/geocoding'
import {
  sendShipmentDeliveredNotification,
  sendConsigneeInTransitNotification,
  sendConsigneeDeliveredNotification,
  sendLabelOrphanedNotification,
  sendDispatchInTransitNotification,
  sendDispatchDeliveredNotification,
} from '@/lib/notifications'
import { format } from 'date-fns'
import { haversineDistanceM } from '@/lib/utils/geo'
import { syncSimLabelToOnomondo } from '@/lib/onomondo'
import { generateShareCode } from '@/lib/utils/share-code'
import { allocateNextCounter, formatDisplayId } from '@/lib/label-id'

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

  /** Skip updating lastLatitude/lastLongitude/lastAccuracy on the label.
   *  Set when coordinates are recycled from the label's own cache (fallback). */
  skipLocationCache?: boolean

  /** Onomondo event type (e.g. 'location', 'network-registration'). */
  eventType?: string
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
    type: true,
    name: true,
    status: true,
    shareCode: true,
    userId: true,
    orgId: true,
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

  // Auto-register: if no label found but IMEI/ICCID provided, create one.
  // Prefer the 9-digit displayId (counter + last-4 of IMEI) as deviceId —
  // matches what factory provisionLabel produces, so the sticker, our
  // deviceId, and Onomondo's SIM label all agree. Fall back to TIP-XXX only
  // when IMEI is missing (e.g. network-registration events without a device
  // attached) — backfilling deviceId once IMEI arrives is risky since
  // dispatches, shipments and events all reference it.
  if (!label && (input.imei || input.iccid)) {
    const newLabel = await db.$transaction(async (tx) => {
      const counter = await allocateNextCounter(tx)
      const displayId = formatDisplayId(counter, input.imei ?? null)
      const deviceId = displayId ?? (await generateNextDeviceId(tx))
      return tx.label.create({
        data: {
          deviceId,
          counter,
          displayId,
          imei: input.imei || null,
          iccid: input.iccid || null,
          status: 'ACTIVE',
          manufacturedAt: new Date(),
        },
        include: shipmentInclude,
      })
    })
    label = newLabel
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] auto-registered new label', {
        deviceId: newLabel.deviceId,
        imei: input.imei ?? null,
        iccid: input.iccid ?? null,
      })

      // Sync deviceId as SIM label in Onomondo dashboard (fire-and-forget)
      if (input.iccid) {
        syncSimLabelToOnomondo(input.iccid, newLabel.deviceId).catch((err) =>
          console.warn('[Onomondo] label sync failed:', err)
        )
      }
    }
  }

  if (!label) {
    throw new LocationReportError('Device not found', 404)
  }

  // Backfill/update identifiers on the resolved label.
  // The auto-register branch writes imei on new labels, but when a label is
  // resolved by ICCID (or pre-created manually as SOLD inventory) the imei
  // field stays null. Persist whatever the device is currently reporting.
  const identifierUpdates: { imei?: string; iccid?: string; displayId?: string } = {}
  if (input.imei && input.imei !== label.imei) {
    identifierUpdates.imei = input.imei
  }
  // Backfill displayId for labels that don't have one (legacy + newly matched IMEI)
  const effectiveImei = input.imei || label.imei
  if (!label.displayId && effectiveImei) {
    if (label.counter != null) {
      const next = formatDisplayId(label.counter, effectiveImei)
      if (next) identifierUpdates.displayId = next
    } else {
      // Legacy label (e.g. TIP-016) has no counter — allocate one atomically
      try {
        const updated = await db.$transaction(async (tx) => {
          const counter = await allocateNextCounter(tx)
          const displayId = formatDisplayId(counter, effectiveImei)
          return tx.label.update({
            where: { id: label.id },
            data: { counter, ...(displayId ? { displayId } : {}) },
          })
        })
        label.counter = updated.counter
        if (updated.displayId) {
          label.displayId = updated.displayId
        }
      } catch (err) {
        console.warn('[Device report] failed to backfill counter for legacy label', {
          labelId: label.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }
  }
  if (input.iccid && input.iccid !== label.iccid) {
    identifierUpdates.iccid = input.iccid
  }
  if (Object.keys(identifierUpdates).length > 0) {
    try {
      await db.label.update({
        where: { id: label.id },
        data: identifierUpdates,
      })
      Object.assign(label, identifierUpdates)
    } catch (err) {
      // Non-critical: log and continue. Most likely a unique-constraint race
      // (another label already claimed this imei); dedup will resolve later.
      console.warn('[Device report] failed to backfill label identifiers', {
        labelId: label.id,
        updates: identifierUpdates,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // When displayId gets backfilled for the first time on a legacy TIP-XXX
  // label, rename the SIM on Onomondo so its dashboard matches the new format.
  // Fire-and-forget — never block ingest on an external call.
  if (
    identifierUpdates.displayId &&
    label.iccid &&
    process.env.NODE_ENV !== 'test'
  ) {
    syncSimLabelToOnomondo(label.iccid, identifierUpdates.displayId).catch(
      (err) => console.warn('[Onomondo] label rename failed:', err),
    )
  }

  // Manufacturing cooldown: suppress LocationEvent creation for 24h after
  // auto-registration. When a label is physically built, the SIM activation
  // triggers Onomondo events from the factory. These must not appear in the
  // end user's tracking history.
  const MANUFACTURING_COOLDOWN_MS = 24 * 60 * 60 * 1000
  if (
    label.manufacturedAt &&
    Date.now() - new Date(label.manufacturedAt).getTime() < MANUFACTURING_COOLDOWN_MS
  ) {
    const now = new Date()
    if (!label.lastSeenAt || now > label.lastSeenAt) {
      await db.label.update({
        where: { id: label.id },
        data: { lastSeenAt: now },
      })
    }
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] manufacturing cooldown — event suppressed', {
        deviceId: label.deviceId,
        manufacturedAt: new Date(label.manufacturedAt).toISOString(),
        hoursRemaining: (
          (MANUFACTURING_COOLDOWN_MS - (Date.now() - new Date(label.manufacturedAt).getTime())) /
          (60 * 60 * 1000)
        ).toFixed(1),
      })
    }
    return {
      success: true,
      locationId: '',
      shipmentId: null,
      deviceId: label.deviceId,
    }
  }

  // Get the active shipment (if any).
  //
  // Prefer an active LABEL_DISPATCH (label.shipmentLabels) over a
  // CARGO_TRACKING (label.shipments). While a dispatch is still PENDING or
  // IN_TRANSIT the label is in the courier's hands, so reports belong to the
  // dispatch so the receiver's tracking page stays live. Only once the dispatch
  // completes does a pre-created cargo take over — and the 1-hour DELIVERED
  // grace window baked into `activeShipmentWhere` keeps late-arriving courier
  // events attached to the dispatch too.
  const activeShipment =
    label.shipmentLabels[0]?.shipment ?? label.shipments[0]

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
  // NOTE: Do NOT promote to ACTIVE here — keep SOLD so the label stays in the
  // "available labels" dropdown. The cargo creation flow handles SOLD → ACTIVE.
  if (!activeShipment && !label.claimToken && label.status === 'SOLD') {
    const claimToken = generateShareCode()
    const claimExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000) // 48h window

    await db.label.update({
      where: { id: label.id },
      data: {
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
    // Still update lastSeenAt so the label appears active
    if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
      await db.label.update({
        where: { id: label.id },
        data: { lastSeenAt: receivedAt },
      })
    }
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

  // Coordinate dedup: skip if the same label reported the same coordinates
  // within the last 5 minutes (device hasn't moved, no need for a new event)
  const COORD_DEDUP_WINDOW_MS = 5 * 60 * 1000
  const coordDedup = await db.locationEvent.findFirst({
    where: {
      labelId: label.id,
      latitude: effectiveLat,
      longitude: effectiveLng,
      source: input.source ?? 'GPS',
      recordedAt: { gte: new Date(recordedAt.getTime() - COORD_DEDUP_WINDOW_MS) },
    },
    orderBy: { recordedAt: 'desc' },
    select: { id: true, shipmentId: true },
  })

  if (coordDedup) {
    // Still update lastSeenAt so the label appears active
    if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
      await db.label.update({
        where: { id: label.id },
        data: { lastSeenAt: receivedAt },
      })
    }
    if (process.env.NODE_ENV !== 'test') {
      console.info('[Device report] coordinate dedup skipped (same location within 5min)', {
        deviceId: label.deviceId,
        existingId: coordDedup.id,
        recordedAt: recordedAt.toISOString(),
      })
    }
    return {
      success: true,
      locationId: coordDedup.id,
      shipmentId: coordDedup.shipmentId,
      deviceId: label.deviceId,
    }
  }

  // Proximity dedup for cell tower events: cell towers have 300-2000m accuracy,
  // so sub-3km differences within 60 minutes are noise, not movement.
  // Only applies to CELL_TOWER source — GPS is precise enough for exact dedup.
  // Radius is 3km (towers near county borders can be several km apart) and window
  // is 60 minutes (devices often report once per hour).
  const source = input.source ?? 'GPS'
  const PROXIMITY_DEDUP_RADIUS_M = 3000
  const CELL_TOWER_DEDUP_WINDOW_MS = 60 * 60 * 1000
  if (source === 'CELL_TOWER') {
    const recentEvents = await db.locationEvent.findMany({
      where: {
        labelId: label.id,
        source: 'CELL_TOWER',
        recordedAt: { gte: new Date(recordedAt.getTime() - CELL_TOWER_DEDUP_WINDOW_MS) },
      },
      orderBy: { recordedAt: 'desc' },
      take: 5,
      select: { id: true, shipmentId: true, latitude: true, longitude: true },
    })

    const proximityMatch = recentEvents.find(
      (ev) =>
        ev.latitude !== null &&
        ev.longitude !== null &&
        haversineDistanceM(effectiveLat, effectiveLng, ev.latitude, ev.longitude) < PROXIMITY_DEDUP_RADIUS_M
    )

    if (proximityMatch) {
      if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
        await db.label.update({
          where: { id: label.id },
          data: { lastSeenAt: receivedAt },
        })
      }
      if (process.env.NODE_ENV !== 'test') {
        console.info('[Device report] proximity dedup skipped (cell tower within 500m/5min)', {
          deviceId: label.deviceId,
          existingId: proximityMatch.id,
          recordedAt: recordedAt.toISOString(),
        })
      }
      return {
        success: true,
        locationId: proximityMatch.id,
        shipmentId: proximityMatch.shipmentId,
        deviceId: label.deviceId,
      }
    }
  }

  // Velocity sanity check: reject events that imply impossible travel speed.
  // Cell tower databases occasionally map a cell ID to the wrong country entirely,
  // producing "teleportation" — e.g. Cologne and Bao'an District at the same timestamp.
  // If speed exceeds MAX_PLAUSIBLE_SPEED_MS (≈1000 km/h, faster than any cargo transport),
  // skip the event. When timestamps are identical (delta=0), any distance > 0 is infinite speed.
  const MAX_PLAUSIBLE_SPEED_MS = 278 // ~1000 km/h in m/s
  const recentEventForVelocity = await db.locationEvent.findFirst({
    where: {
      labelId: label.id,
      recordedAt: { lte: recordedAt },
      excludedReason: null,
    },
    orderBy: { recordedAt: 'desc' },
    select: { id: true, latitude: true, longitude: true, recordedAt: true },
  })

  if (recentEventForVelocity && recentEventForVelocity.latitude !== null && recentEventForVelocity.longitude !== null) {
    const distanceM = haversineDistanceM(
      effectiveLat, effectiveLng,
      recentEventForVelocity.latitude, recentEventForVelocity.longitude
    )
    const timeDeltaS = Math.abs(recordedAt.getTime() - recentEventForVelocity.recordedAt.getTime()) / 1000
    // If same timestamp (delta=0) and non-trivial distance, or speed exceeds max plausible
    const impliedSpeed = timeDeltaS > 0 ? distanceM / timeDeltaS : (distanceM > 100 ? Infinity : 0)
    if (impliedSpeed > MAX_PLAUSIBLE_SPEED_MS) {
      if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
        await db.label.update({
          where: { id: label.id },
          data: { lastSeenAt: receivedAt },
        })
      }
      console.warn('[Device report] velocity sanity check failed — teleportation rejected', {
        deviceId: label.deviceId,
        recordedAt: recordedAt.toISOString(),
        distanceKm: Math.round(distanceM / 1000),
        timeDeltaS,
        impliedSpeedKmh: timeDeltaS > 0 ? Math.round((distanceM / timeDeltaS) * 3.6) : 'Infinity',
        from: { lat: recentEventForVelocity.latitude, lng: recentEventForVelocity.longitude },
        to: { lat: effectiveLat, lng: effectiveLng },
      })
      return {
        success: true,
        locationId: recentEventForVelocity.id,
        shipmentId: activeShipment?.id ?? null,
        deviceId: label.deviceId,
      }
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
      eventType: input.eventType ?? null,
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

  // Reset digest backoff for IN_TRANSIT shipments that had previously entered
  // a silent/stuck digest cycle. Reaching this point means the event cleared
  // the proximity/velocity/coordinate dedup layers above, so it represents a
  // genuine new signal (recovery from silence) or genuine movement (recovery
  // from stuck). The updateMany is a no-op when digestCount is already 0, so
  // the happy path pays only for the WHERE index lookup.
  if (activeShipment && activeShipment.status === 'IN_TRANSIT') {
    db.shipment
      .updateMany({
        where: { id: activeShipment.id, digestCount: { gt: 0 } },
        data: { digestCount: 0, lastDigestAt: null },
      })
      .catch((err) => {
        console.warn(
          `[Device report] digest reset failed for ${activeShipment.id}:`,
          err
        )
      })
  }

  // Reverse-geocode the location and persist on the record
  if (!input.skipGeocode) {
    try {
      const geo = await reverseGeocode(effectiveLat, effectiveLng)
      // Stamp geocodedAt on every attempt (success or failure) so the
      // backfill cron waits ≥24h before retrying permanently-unresolvable
      // coords and the UI can distinguish "pending" from "failed".
      await db.locationEvent.update({
        where: { id: locationEvent.id },
        data: geo
          ? {
              geocodedCity: geo.city,
              geocodedArea: geo.area,
              geocodedCountry: geo.country,
              geocodedCountryCode: geo.countryCode,
              geocodedAt: new Date(),
            }
          : { geocodedAt: new Date() },
      })
    } catch (err) {
      // Geocoding failure should never block location ingest
      console.warn('[Device report] geocoding failed:', err)
    }
  }

  // Update label: lastSeenAt only if newer (prevents regression from
  // out-of-order cell tower events), battery if provided, and cache last known coords
  const labelUpdateData: Record<string, unknown> = {}
  if (!label.lastSeenAt || receivedAt > label.lastSeenAt) {
    labelUpdateData.lastSeenAt = receivedAt
  }
  // First in-the-wild location for a label that has an assigned owner (any
  // shipment) → stamp activatedAt and promote SOLD → ACTIVE. This gives us a
  // clean "first reported from the field" timestamp independent of whether a
  // cargo shipment was pre-created. Orphaned SOLD labels (no active shipment)
  // are intentionally skipped — they go through the claim-token flow above.
  if (activeShipment && !label.activatedAt) {
    labelUpdateData.activatedAt = receivedAt
    if (label.status === 'SOLD') {
      labelUpdateData.status = 'ACTIVE'
    }
  }
  if (input.battery !== undefined) {
    labelUpdateData.batteryPct = input.battery
  }
  // Cache last known coordinates on the label for fast fallback
  // when future webhooks arrive with null location data.
  // Skip when coordinates are recycled from the label's own cache
  // to avoid overwriting accuracy with null.
  if (!input.skipLocationCache) {
    labelUpdateData.lastLatitude = effectiveLat
    labelUpdateData.lastLongitude = effectiveLng
    labelUpdateData.lastAccuracy = input.accuracy ?? null
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
      // Reset digest backoff — the "awaiting first signal" problem that the
      // digest was nagging about has resolved. Any subsequent silent/stuck
      // episode starts fresh instead of stacking on the pending backoff.
      data: { status: 'IN_TRANSIT', digestCount: 0, lastDigestAt: null },
    })
    console.info(`[Device report] shipment ${activeShipment.id} status: PENDING → IN_TRANSIT (${label.deviceId})`)

    if (activeShipment.type === 'LABEL_DISPATCH') {
      // Dispatch buyer notification — "Your TIP labels are on their way"
      sendDispatchInTransitNotification({ shipmentId: activeShipment.id }).catch((err) =>
        console.error('Failed to send dispatch in-transit notification:', err)
      )
    }

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
          // Reset digest backoff on delivery — terminal state; defensive even
          // though the digest cron already excludes DELIVERED shipments.
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            digestCount: 0,
            lastDigestAt: null,
          },
        })
        console.info(`[Device report] shipment ${activeShipment.id} status: IN_TRANSIT → DELIVERED (${label.deviceId}, distance=${Math.round(distance)}m)`)

        if (activeShipment.type === 'LABEL_DISPATCH') {
          // Dispatch buyer notification — "Your TIP labels have arrived, time to activate"
          sendDispatchDeliveredNotification({ shipmentId: activeShipment.id }).catch((err) =>
            console.error('Failed to send dispatch delivered notification:', err)
          )
        } else {
          sendShipmentDeliveredNotification({
            userId: activeShipment.userId,
            orgId: activeShipment.orgId,
            shipmentId: activeShipment.id,
            shipmentName: activeShipment.name || 'Unnamed Shipment',
            deviceId: label.deviceId,
            shareCode: activeShipment.shareCode,
            destination:
              activeShipment.destinationAddress || 'Destination',
            source: 'auto',
          }).catch((err) =>
            console.error('Failed to send delivery notification:', err)
          )
        }

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
    // Always stamp geocodedAt so the cron doesn't retry too soon and the UI
    // can tell "never tried" (null) from "tried, no match" (set + null city).
    await db.locationEvent.update({
      where: { id: locationId },
      data: geo
        ? {
            geocodedCity: geo.city,
            geocodedArea: geo.area,
            geocodedCountry: geo.country,
            geocodedCountryCode: geo.countryCode,
            geocodedAt: new Date(),
          }
        : { geocodedAt: new Date() },
    })
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
 * Fallback identifier used only when IMEI is missing at auto-register time —
 * the preferred format is the 9-digit displayId from formatDisplayId().
 */
async function generateNextDeviceId(
  client: Prisma.TransactionClient | typeof db = db,
): Promise<string> {
  const latest = await client.label.findFirst({
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
