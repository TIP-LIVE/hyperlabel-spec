import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
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
  const shipment = await db.shipment.findUnique({
    where: { id },
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

  const shipment = await db.shipment.findUnique({
    where: { id },
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
        where: { source: 'CELL_TOWER' },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment || shipment.type !== 'CARGO_TRACKING') {
    notFound()
  }

  // Backfill orphaned label locations (created by webhooks before shipment association)
  let locations = shipment.locations
  if (shipment.labelId) {
    const backfilled = await db.locationEvent.updateMany({
      where: { labelId: shipment.labelId, shipmentId: null },
      data: { shipmentId: shipment.id },
    })
    if (backfilled.count > 0) {
      locations = await db.locationEvent.findMany({
        where: { shipmentId: shipment.id, source: 'CELL_TOWER' },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      })
    }
  }

  const totalLocations = await db.locationEvent.count({
    where: { shipmentId: shipment.id, source: 'CELL_TOWER' },
  })

  const oldestLocation = await db.locationEvent.findFirst({
    where: { shipmentId: shipment.id },
    orderBy: { recordedAt: 'asc' },
  })

  // Check access: org membership + ownership
  const { orgId } = await auth()
  if (user && user.role !== 'admin') {
    if (shipment.orgId && shipment.orgId !== orgId) {
      notFound()
    }
  }

  // Prefer the short /w/{displayId} form so the public URL matches the sticker.
  // Falls back to /track/{shareCode} if the label has no displayId yet.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const trackingUrl = shipment.label?.displayId
    ? `${appUrl}/${shipment.label.displayId}`
    : `${appUrl}/track/${shipment.shareCode}`

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

  return <CargoDetailClient initialData={serializedData} trackingUrl={trackingUrl} initialTotalLocations={totalLocations} initialOldestLocation={serializedOldestLocation} isAdmin={user?.role === 'admin'} />
}
