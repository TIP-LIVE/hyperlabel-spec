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
          batteryPct: true,
          status: true,
          firmwareVersion: true,
          activatedAt: true,
          lastSeenAt: true,
        },
      },
      locations: {
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment || shipment.type !== 'CARGO_TRACKING') {
    notFound()
  }

  const totalLocations = await db.locationEvent.count({
    where: { shipmentId: shipment.id },
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

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

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
    label: shipment.label ? {
      deviceId: shipment.label.deviceId,
      batteryPct: shipment.label.batteryPct,
      status: shipment.label.status,
      firmwareVersion: shipment.label.firmwareVersion,
      activatedAt: shipment.label.activatedAt?.toISOString() ?? null,
      lastSeenAt: shipment.label.lastSeenAt?.toISOString() ?? null,
    } : null,
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

  return <CargoDetailClient initialData={serializedData} trackingUrl={trackingUrl} initialTotalLocations={totalLocations} initialOldestLocation={serializedOldestLocation} />
}
