import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import type { Metadata } from 'next'
import { ClaimPageClient } from './claim-page-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params
  const label = await db.label.findUnique({
    where: { claimToken: token },
    select: { deviceId: true },
  })

  return {
    title: label ? `Claim Label: ${label.deviceId}` : 'Claim Label',
    description: 'Create a shipment for your activated tracking label',
  }
}

export default async function ClaimPage({ params }: PageProps) {
  const { token } = await params

  const label = await db.label.findUnique({
    where: { claimToken: token },
    select: {
      id: true,
      deviceId: true,
      batteryPct: true,
      claimExpiresAt: true,
      firstUnlinkedReportAt: true,
      _count: {
        select: { locations: true },
      },
    },
  })

  if (!label) {
    notFound()
  }

  // Check if already claimed (has active shipment)
  const existingShipment = await db.shipment.findFirst({
    where: {
      labelId: label.id,
      status: { in: ['PENDING', 'IN_TRANSIT'] },
    },
    select: { shareCode: true },
  })

  const expired = label.claimExpiresAt ? new Date() > label.claimExpiresAt : false

  return (
    <ClaimPageClient
      token={token}
      deviceId={label.deviceId}
      batteryPct={label.batteryPct}
      locationCount={label._count.locations}
      firstReportAt={label.firstUnlinkedReportAt?.toISOString() ?? null}
      claimExpiresAt={label.claimExpiresAt?.toISOString() ?? null}
      expired={expired}
      existingShareCode={existingShipment?.shareCode ?? null}
    />
  )
}
