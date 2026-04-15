import { notFound, redirect } from 'next/navigation'
import { db, VALID_LOCATION } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'
import { CargoDetailClient } from '@/components/cargo/cargo-detail-client'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const shipment = await db.shipment.findFirst({
    where: /^\d{9}$/.test(id) ? { label: { displayId: id } } : { id },
    select: { name: true },
  })

  return {
    title: shipment?.name || 'Cargo Details',
    description: 'View cargo tracking details and location history',
  }
}

export default async function CargoDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user && isClerkConfigured()) {
    redirect('/sign-in')
  }

  const { orgId } = await auth()
  const isAdmin = user?.role === 'admin'

  // Accept either the cuid shipment.id OR the 9-digit label displayId.
  // A label can accumulate multiple CARGO_TRACKING shipments over time
  // (cancelled/delivered ones stay in history) and can even belong to
  // different orgs across its lifetime. Scope the lookup to the viewer's
  // current org so findFirst doesn't return a sibling shipment the user
  // has no access to — which would 404 after the access check even though
  // a valid match exists. Admins see all.
  const isDisplayId = /^\d{9}$/.test(id)
  const shipment = await db.shipment.findFirst({
    where: isDisplayId
      ? {
          label: { displayId: id },
          type: 'CARGO_TRACKING',
          ...(isAdmin ? {} : { orgId }),
        }
      : {
          id,
          ...(isAdmin ? {} : { orgId }),
        },
    include: {
      label: {
        select: {
          id: true,
          deviceId: true,
          displayId: true,
          batteryPct: true,
          status: true,
          firmwareVersion: true,
          activatedAt: true,
          lastSeenAt: true,
        },
      },
      locations: {
        where: { source: 'CELL_TOWER', ...VALID_LOCATION },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
    // Prefer the newest shipment when a label has been re-used in-org.
    orderBy: { createdAt: 'desc' },
  })

  if (!shipment || shipment.type !== 'CARGO_TRACKING') {
    notFound()
  }

  // Backfill orphaned label locations (created by webhooks shortly before
  // shipment association — e.g. label activated while user was filling out the
  // cargo form). Only backfill events from the last 24h before shipment
  // creation to avoid pulling in stale history from previous uses of the label.
  let locations = shipment.locations
  if (shipment.labelId) {
    const backfillCutoff = new Date(shipment.createdAt.getTime() - 24 * 60 * 60 * 1000)
    const backfilled = await db.locationEvent.updateMany({
      where: {
        labelId: shipment.labelId,
        shipmentId: null,
        recordedAt: { gte: backfillCutoff },
      },
      data: { shipmentId: shipment.id },
    })
    if (backfilled.count > 0) {
      locations = await db.locationEvent.findMany({
        where: { shipmentId: shipment.id, source: 'CELL_TOWER', ...VALID_LOCATION },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      })
    }
  }

  const totalLocations = await db.locationEvent.count({
    where: { shipmentId: shipment.id, source: 'CELL_TOWER', ...VALID_LOCATION },
  })

  const oldestLocation = await db.locationEvent.findFirst({
    where: { shipmentId: shipment.id, ...VALID_LOCATION },
    orderBy: { recordedAt: 'asc' },
  })

  // Access control is already baked into the findFirst query above (orgId
  // scope for non-admins), so no post-fetch check is needed.

  // Canonical public URL per spec: tip.live/{displayId}. The proxy rewrites
  // that to /activate/{displayId} which renders the public tracking view
  // inline. No /track/{shareCode} fallback — when displayId is null the
  // label was created outside the spec-compliant path and the sticker URL
  // wouldn't work either. Surface the gap via `labelNeedsReprovisioning`
  // rather than silently showing a different URL than the sticker.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const labelNeedsReprovisioning = !shipment.label?.displayId
  const trackingUrl = shipment.label?.displayId
    ? `${appUrl}/${shipment.label.displayId}`
    : ''

  const serializedData = {
    id: shipment.id,
    name: shipment.name,
    status: shipment.status,
    originAddress: shipment.originAddress,
    originLat: shipment.originLat,
    originLng: shipment.originLng,
    destinationAddress: shipment.destinationAddress,
    destinationLat: shipment.destinationLat,
    destinationLng: shipment.destinationLng,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    shareCode: shipment.shareCode,
    consigneeEmail: shipment.consigneeEmail,
    consigneePhone: shipment.consigneePhone,
    photoUrls: shipment.photoUrls,
    label: shipment.label ? {
      deviceId: shipment.label.deviceId,
      displayId: shipment.label.displayId,
      batteryPct: shipment.label.batteryPct,
      status: shipment.label.status,
      firmwareVersion: shipment.label.firmwareVersion,
      activatedAt: shipment.label.activatedAt?.toISOString() ?? null,
      lastSeenAt: shipment.label.lastSeenAt?.toISOString() ?? null,
    } : null,
    locations: locations.map((loc) => ({
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
      geocodedAt: loc.geocodedAt?.toISOString() ?? null,
      eventType: loc.eventType,
    })),
  }

  const serializedOldestLocation = oldestLocation ? {
    id: oldestLocation.id,
    latitude: oldestLocation.latitude,
    longitude: oldestLocation.longitude,
    recordedAt: oldestLocation.recordedAt.toISOString(),
    geocodedCity: oldestLocation.geocodedCity,
    geocodedArea: oldestLocation.geocodedArea,
    geocodedCountry: oldestLocation.geocodedCountry,
    geocodedCountryCode: oldestLocation.geocodedCountryCode,
  } : null

  return <CargoDetailClient initialData={serializedData} trackingUrl={trackingUrl} labelNeedsReprovisioning={labelNeedsReprovisioning} initialTotalLocations={totalLocations} initialOldestLocation={serializedOldestLocation} isAdmin={user?.role === 'admin'} />
}
