import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'
import { DispatchDetailClient } from '@/components/dispatch/dispatch-detail-client'
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
    title: shipment?.name || 'Dispatch Details',
    description: 'View label dispatch details and tracking',
  }
}

export default async function DispatchDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user && isClerkConfigured()) {
    redirect('/sign-in')
  }

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      shipmentLabels: {
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
        },
      },
      locations: {
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
    notFound()
  }

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
    shipmentLabels: shipment.shipmentLabels.map((sl) => ({
      deviceId: sl.label.deviceId,
      batteryPct: sl.label.batteryPct,
      status: sl.label.status,
      firmwareVersion: sl.label.firmwareVersion,
      activatedAt: sl.label.activatedAt?.toISOString() ?? null,
      lastSeenAt: sl.label.lastSeenAt?.toISOString() ?? null,
    })),
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

  return <DispatchDetailClient initialData={serializedData} trackingUrl={trackingUrl} isAdmin={user?.role === 'admin'} />
}
