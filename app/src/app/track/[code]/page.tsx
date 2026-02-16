import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'
import { TrackingPageClient } from '@/components/tracking/tracking-page-client'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params
  const shipment = await db.shipment.findUnique({
    where: { shareCode: code },
    select: { name: true },
  })

  return {
    title: shipment?.name ? `Track: ${shipment.name}` : 'Track Shipment',
    description: 'Track your shipment door-to-door in real-time with TIP',
  }
}

export default async function PublicTrackingPage({ params }: PageProps) {
  const { code } = await params

  const shipment = await db.shipment.findUnique({
    where: { shareCode: code },
    include: {
      label: {
        select: {
          deviceId: true,
          batteryPct: true,
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

  // Check if sharing is enabled
  if (!shipment.shareEnabled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">Tracking Disabled</CardTitle>
            <CardDescription>
              The owner has disabled public tracking for this shipment.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">Go to TIP</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

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
    label: shipment.label,
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

  return <TrackingPageClient code={code} initialData={serializedData} />
}
