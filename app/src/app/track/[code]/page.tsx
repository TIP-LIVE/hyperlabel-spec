import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package } from 'lucide-react'
import { TrackingPageClient } from '@/components/tracking/tracking-page-client'
import { loadPublicTrackingData } from '@/lib/public-tracking'
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

  const exists = await db.shipment.findUnique({
    where: { shareCode: code },
    select: { id: true, shareEnabled: true },
  })
  if (!exists) notFound()

  if (!exists.shareEnabled) {
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

  const serializedData = await loadPublicTrackingData({ shareCode: code })
  if (!serializedData) notFound()

  return <TrackingPageClient code={code} initialData={serializedData} />
}
