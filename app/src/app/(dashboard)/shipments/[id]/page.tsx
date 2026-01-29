import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Battery,
  Calendar,
  MapPin,
  Package,
  Share2,
  Truck,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ShareLinkButton } from '@/components/shipments/share-link-button'

export const dynamic = 'force-dynamic'
import { ShipmentTimeline } from '@/components/shipments/shipment-timeline'
import { ShipmentMap } from '@/components/maps/shipment-map'
import type { Metadata } from 'next'

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

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const, icon: MapPin },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const, icon: Package },
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
        take: 50,
      },
    },
  })

  if (!shipment) {
    notFound()
  }

  // Check ownership
  if (user && shipment.userId !== user.id && user.role !== 'admin') {
    notFound()
  }

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const latestLocation = shipment.locations[0]
  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/shipments">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {shipment.name || 'Untitled Shipment'}
            </h1>
            <p className="text-sm text-muted-foreground">{shipment.label.deviceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          <ShareLinkButton shareCode={shipment.shareCode} trackingUrl={trackingUrl} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content - Map placeholder + Timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Live Map */}
          <Card>
            <CardHeader>
              <CardTitle>Live Location</CardTitle>
              <CardDescription>
                {latestLocation
                  ? `Last updated ${formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}`
                  : 'No location data yet'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShipmentMap
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
                height="350px"
              />
            </CardContent>
          </Card>

          {/* Location Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Location History</CardTitle>
              <CardDescription>
                {shipment.locations.length} location events recorded
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShipmentTimeline locations={shipment.locations} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Details */}
        <div className="space-y-6">
          {/* Shipment Info */}
          <Card>
            <CardHeader>
              <CardTitle>Shipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Destination</p>
                <p className="font-medium">
                  {shipment.destinationAddress || 'Not specified'}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground">Origin</p>
                <p className="font-medium">
                  {shipment.originAddress || 'Not specified'}
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {format(new Date(shipment.createdAt), 'PPP')}
                  </p>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              {shipment.deliveredAt && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="font-medium">
                        {format(new Date(shipment.deliveredAt), 'PPP')}
                      </p>
                    </div>
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Label Info */}
          <Card>
            <CardHeader>
              <CardTitle>Label Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Device ID</p>
                  <p className="font-mono font-medium">{shipment.label.deviceId}</p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Battery</p>
                  <p
                    className={`font-medium ${
                      (shipment.label.batteryPct ?? 100) < 20 ? 'text-destructive' : ''
                    }`}
                  >
                    {shipment.label.batteryPct !== null
                      ? `${shipment.label.batteryPct}%`
                      : 'Unknown'}
                  </p>
                </div>
                <Battery className="h-4 w-4 text-muted-foreground" />
              </div>
              {shipment.label.activatedAt && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Activated</p>
                    <p className="font-medium">
                      {format(new Date(shipment.label.activatedAt), 'PPP')}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Tracking
              </CardTitle>
              <CardDescription>
                Share this link with your consignee to let them track the shipment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-3">
                <p className="break-all font-mono text-xs">{trackingUrl}</p>
              </div>
              <ShareLinkButton
                shareCode={shipment.shareCode}
                trackingUrl={trackingUrl}
                className="mt-3 w-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
