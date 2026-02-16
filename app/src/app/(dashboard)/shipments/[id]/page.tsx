import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser, canViewAllOrgData } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'
import { ShipmentDetailClient } from '@/components/shipments/shipment-detail-client'
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
    title: shipment?.name || 'Shipment Details',
    description: 'View shipment tracking details and location history',
  }
}

export default async function ShipmentDetailPage({ params }: PageProps) {
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
        },
      },
      locations: {
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment) {
    notFound()
  }

  // Check access: org membership + ownership
  const { orgId, orgRole } = await auth()
  if (user && user.role !== 'admin') {
    // Must be in the same org
    if (shipment.orgId && shipment.orgId !== orgId) {
      notFound()
    }
    // org:member can only see own records
    if (!canViewAllOrgData(orgRole || 'org:member') && shipment.userId !== user.id) {
      notFound()
    }
  }

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  // Serialize for client component (Dates → strings)
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
    label: {
      deviceId: shipment.label.deviceId,
      batteryPct: shipment.label.batteryPct,
      status: shipment.label.status,
      firmwareVersion: shipment.label.firmwareVersion,
      activatedAt: shipment.label.activatedAt?.toISOString() ?? null,
    },
    locations: shipment.locations.map((loc) => ({
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      recordedAt: loc.recordedAt.toISOString(),
      receivedAt: loc.receivedAt.toISOString(),
      batteryPct: loc.batteryPct,
      accuracyM: loc.accuracyM,
      isOfflineSync: loc.isOfflineSync,
    })),
  }

  return <ShipmentDetailClient initialData={serializedData} trackingUrl={trackingUrl} />
}
