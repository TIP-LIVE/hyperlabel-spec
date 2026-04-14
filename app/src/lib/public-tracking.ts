import { db, VALID_LOCATION } from '@/lib/db'

/**
 * Fetch + serialize a shipment for the public TrackingPageClient.
 * Returns null if the shipment doesn't exist or sharing is disabled.
 *
 * Used by both /track/[shareCode] and the /activate/[displayId] route
 * (which renders the tracking page inline so the bare /NNNNNYYYY URL
 * stays in the address bar after a QR scan).
 */
export async function loadPublicTrackingData(
  where: { shareCode: string } | { id: string }
) {
  const shipment = await db.shipment.findUnique({
    where,
    include: {
      label: {
        select: {
          deviceId: true,
          displayId: true,
          batteryPct: true,
          lastSeenAt: true,
        },
      },
      shipmentLabels: { select: { labelId: true } },
      locations: {
        where: { source: 'CELL_TOWER', ...VALID_LOCATION },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment || !shipment.shareEnabled) return null

  return {
    id: shipment.id,
    type: shipment.type,
    name: shipment.name,
    status: shipment.status,
    labelCount: shipment.shipmentLabels?.length ?? (shipment.label ? 1 : 0),
    originAddress: shipment.originAddress,
    originLat: shipment.originLat,
    originLng: shipment.originLng,
    destinationAddress: shipment.destinationAddress,
    destinationLat: shipment.destinationLat,
    destinationLng: shipment.destinationLng,
    destinationName: shipment.destinationName,
    destinationLine1: shipment.destinationLine1,
    destinationLine2: shipment.destinationLine2,
    destinationCity: shipment.destinationCity,
    destinationState: shipment.destinationState,
    destinationPostalCode: shipment.destinationPostalCode,
    destinationCountry: shipment.destinationCountry,
    addressSubmittedAt: shipment.addressSubmittedAt?.toISOString() ?? null,
    consigneeEmail: shipment.consigneeEmail,
    consigneePhone: shipment.consigneePhone,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    shareCode: shipment.shareCode,
    label: shipment.label
      ? {
          deviceId: shipment.label.deviceId,
          displayId: shipment.label.displayId,
          batteryPct: shipment.label.batteryPct,
          lastSeenAt: shipment.label.lastSeenAt?.toISOString() ?? null,
        }
      : null,
    locations: shipment.locations.map((loc) => ({
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      recordedAt: loc.recordedAt.toISOString(),
      receivedAt: loc.receivedAt.toISOString(),
      batteryPct: loc.batteryPct,
      accuracyM: loc.accuracyM,
      isOfflineSync: loc.isOfflineSync,
      geocodedCity: loc.geocodedCity,
      geocodedArea: loc.geocodedArea,
      geocodedCountry: loc.geocodedCountry,
      geocodedCountryCode: loc.geocodedCountryCode,
      eventType: loc.eventType,
    })),
  }
}
