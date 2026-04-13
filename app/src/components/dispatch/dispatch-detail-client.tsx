'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Battery,
  Package,
  Share2,
  Truck,
  CheckCircle,
  Navigation,
  Tag,
} from 'lucide-react'
import { formatDateTimeFull } from '@/lib/utils/format-date'
import { ShareLinkButton } from '@/components/shipments/share-link-button'
import { EditDispatchDialog } from '@/components/dispatch/edit-dispatch-dialog'


interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: string
  receivedAt?: string
  batteryPct: number | null
  accuracyM: number | null
  isOfflineSync?: boolean
  geocodedCity: string | null
  geocodedArea: string | null
  geocodedCountry: string | null
  geocodedCountryCode: string | null
}

interface LabelInfo {
  deviceId: string
  displayId: string | null
  iccid: string | null
  batteryPct: number | null
  status: string
  firmwareVersion: string | null
  activatedAt: string | null
}

interface DispatchData {
  id: string
  name: string | null
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  originAddress: string | null
  originLat: number | null
  originLng: number | null
  destinationAddress: string | null
  destinationLat: number | null
  destinationLng: number | null
  deliveredAt: string | null
  createdAt: string
  shareCode: string
  shipmentLabels: LabelInfo[]
  locations: LocationPoint[]
}

interface DispatchDetailClientProps {
  initialData: DispatchData
  trackingUrl: string
  backHref?: string
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'success' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' as const, icon: Package },
}

export function DispatchDetailClient({ initialData, trackingUrl, backHref = '/dispatch' }: DispatchDetailClientProps) {
  const [shipment] = useState<DispatchData>(initialData)

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'
  const labelCount = shipment.shipmentLabels?.length || 0

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {shipment.name || 'Unnamed Dispatch'}
              </h1>
              <Badge variant={statusInfo.variant} className="gap-1 px-2.5 py-0.5">
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {labelCount} label{labelCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <EditDispatchDialog
              shipmentId={shipment.id}
              currentName={shipment.name}
              currentDestination={shipment.destinationAddress}
            />
          )}
          <ShareLinkButton shareCode={shipment.shareCode} trackingUrl={trackingUrl} variant="dispatch" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dispatched Labels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Dispatched Labels ({labelCount})
            </CardTitle>
            <CardDescription>
              Labels included in this dispatch
            </CardDescription>
          </CardHeader>
          <CardContent>
            {shipment.shipmentLabels && shipment.shipmentLabels.length > 0 ? (
              <div className="space-y-2">
                {shipment.shipmentLabels.map((label) => (
                  <div
                    key={label.deviceId}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">{label.displayId || label.deviceId}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{label.status}</span>
                        {label.iccid && (
                          <span className="font-mono">ICCID: {label.iccid}</span>
                        )}
                      </div>
                    </div>
                    {label.batteryPct !== null && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Battery className="h-3.5 w-3.5" />
                        {label.batteryPct}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Tag className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No labels in this dispatch</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Route & Details Card (merged) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Destination — labels ship from TIP warehouse by default, so origin is not shown */}
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">B</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Destination</p>
                  <p className="text-sm">{shipment.destinationAddress || 'Not specified'}</p>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p>{formatDateTimeFull(shipment.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Labels</p>
                  <p>{labelCount} label{labelCount !== 1 ? 's' : ''}</p>
                </div>
                {shipment.deliveredAt && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      {formatDateTimeFull(shipment.deliveredAt)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Share Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Dispatch
              </CardTitle>
              <CardDescription>
                Share this link with your recipient so they know their labels are on the way
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-muted px-3 py-2.5">
                <p className="break-all font-mono text-xs text-muted-foreground">{trackingUrl}</p>
              </div>
              <ShareLinkButton
                shareCode={shipment.shareCode}
                trackingUrl={trackingUrl}
                variant="dispatch"
                className="mt-3 w-full rounded-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
