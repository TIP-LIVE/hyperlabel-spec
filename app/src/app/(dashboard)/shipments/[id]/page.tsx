import { notFound, redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
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

  if (!shipment) {
    notFound()
  }

  // Check access: org membership + ownership
  const { orgId, orgRole } = await auth()
  if (user && user.role !== 'admin') {
    // B2B: only same-org can view
    if (shipment.orgId && shipment.orgId !== orgId) {
      notFound()
    }
  }

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  // Serialize for client component (Dates → strings)
  const serializeLabel = (l: { deviceId: string; batteryPct: number | null; status: string; firmwareVersion: string | null; activatedAt: Date | null }) => ({
    deviceId: l.deviceId,
    batteryPct: l.batteryPct,
    status: l.status,
    firmwareVersion: l.firmwareVersion,
    activatedAt: l.activatedAt?.toISOString() ?? null,
  })

  const serializedData = {
    id: shipment.id,
    type: shipment.type,
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
    label: shipment.label ? serializeLabel(shipment.label) : null,
    shipmentLabels: shipment.shipmentLabels.map((sl) => serializeLabel(sl.label)),
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
