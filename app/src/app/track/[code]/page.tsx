import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Package, MapPin, Battery, Truck } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { PublicTrackingMap } from '@/components/maps/public-tracking-map'
import { PublicTimeline } from '@/components/tracking/public-timeline'
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
    description: 'Track your shipment in real-time with HyperLabel GPS tracking',
  }
}

const statusConfig = {
  PENDING: { label: 'Awaiting Pickup', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const, icon: MapPin },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const, icon: Package },
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
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
              <Link href="/">Go to HyperLabel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const latestLocation = shipment.locations[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-bold">HyperLabel</span>
          </Link>
          <Badge variant={statusInfo.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{shipment.name || 'Shipment Tracking'}</h1>
          <p className="text-sm text-muted-foreground">
            Tracking code: <span className="font-mono">{code}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Live Location</CardTitle>
                <CardDescription>
                  {latestLocation
                    ? `Last updated ${formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}`
                    : 'Waiting for location data...'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PublicTrackingMap
                  locations={shipment.locations.map((loc) => ({
                    id: loc.id,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    recordedAt: loc.recordedAt,
                    batteryPct: loc.batteryPct,
                    accuracyM: loc.accuracyM,
                  }))}
                  destinationLat={shipment.destinationLat}
                  destinationLng={shipment.destinationLng}
                  destinationAddress={shipment.destinationAddress}
                  height="400px"
                />
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Location History</CardTitle>
                <CardDescription>
                  {shipment.locations.length} location updates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PublicTimeline locations={shipment.locations} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      shipment.status === 'DELIVERED'
                        ? 'bg-green-100'
                        : shipment.status === 'IN_TRANSIT'
                          ? 'bg-blue-100'
                          : 'bg-gray-100'
                    }`}
                  >
                    <StatusIcon
                      className={`h-5 w-5 ${
                        shipment.status === 'DELIVERED'
                          ? 'text-green-600'
                          : shipment.status === 'IN_TRANSIT'
                            ? 'text-blue-600'
                            : 'text-gray-600'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium">{statusInfo.label}</p>
                    <p className="text-sm text-muted-foreground">
                      {shipment.status === 'DELIVERED' && shipment.deliveredAt
                        ? `Delivered ${format(new Date(shipment.deliveredAt), 'PPP')}`
                        : shipment.status === 'IN_TRANSIT'
                          ? 'On the way to destination'
                          : 'Waiting for movement'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Destination */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Destination
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  {shipment.destinationAddress || 'Not specified'}
                </p>
              </CardContent>
            </Card>

            {/* Device Info */}
            <Card>
              <CardHeader>
                <CardTitle>Tracking Device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Device ID</span>
                  <span className="font-mono text-sm">{shipment.label.deviceId}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Battery</span>
                  <div className="flex items-center gap-1">
                    <Battery
                      className={`h-4 w-4 ${
                        (shipment.label.batteryPct ?? 100) < 20
                          ? 'text-destructive'
                          : 'text-muted-foreground'
                      }`}
                    />
                    <span
                      className={
                        (shipment.label.batteryPct ?? 100) < 20 ? 'text-destructive' : ''
                      }
                    >
                      {shipment.label.batteryPct !== null
                        ? `${shipment.label.batteryPct}%`
                        : 'Unknown'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {format(new Date(shipment.createdAt), 'PP')}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <p className="font-medium">Need to track your own cargo?</p>
                <p className="mt-1 text-sm opacity-90">
                  Get GPS tracking labels for your valuable shipments.
                </p>
                <Button variant="secondary" className="mt-4 w-full" asChild>
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-white py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by HyperLabel GPS Tracking</p>
          <p className="mt-1">
            <Link href="/" className="hover:underline">
              hyperlabel.io
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
