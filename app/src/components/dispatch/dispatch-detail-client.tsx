'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Battery,
  Package,
  Share2,
  Truck,
  CheckCircle,
  RefreshCw,
  Navigation,
  ArrowRight,
  Send,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ShareLinkButton } from '@/components/shipments/share-link-button'
import { CancelShipmentDialog } from '@/components/shipments/cancel-shipment-dialog'
import { EditShipmentDialog } from '@/components/shipments/edit-shipment-dialog'
import { toast } from 'sonner'


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
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const, icon: Package },
}

export function DispatchDetailClient({ initialData, trackingUrl }: DispatchDetailClientProps) {
  const [shipment] = useState<DispatchData>(initialData)

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'
  const labelCount = shipment.shipmentLabels?.length || 0

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dispatch">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {shipment.name || 'Unnamed Dispatch'}
              </h1>
              <Badge variant="secondary" className="gap-1">
                <Send className="h-3 w-3" />
                Dispatch
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {labelCount} label{labelCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={statusInfo.variant} className="gap-1 px-3 py-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          {shipment.status === 'PENDING' && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/v1/dispatch/${shipment.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'IN_TRANSIT' }),
                  })
                  if (!res.ok) throw new Error('Failed to update status')
                  toast.success('Dispatch marked as in transit')
                  window.location.reload()
                } catch {
                  toast.error('Failed to update status')
                }
              }}
            >
              <Truck className="h-3.5 w-3.5" />
              Mark as In Transit
            </Button>
          )}
          {shipment.status === 'IN_TRANSIT' && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/v1/track/${shipment.shareCode}/confirm-delivery`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                  })
                  if (!res.ok) throw new Error('Failed to confirm delivery')
                  toast.success('Dispatch marked as delivered')
                  window.location.reload()
                } catch {
                  toast.error('Failed to confirm delivery')
                }
              }}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Mark as Delivered
            </Button>
          )}
          <div className="flex items-center gap-1.5">
            {isActive && (
              <EditShipmentDialog
                shipmentId={shipment.id}
                currentName={shipment.name}
                currentOrigin={shipment.originAddress}
                currentDestination={shipment.destinationAddress}
                apiBasePath="/api/v1/dispatch"
              />
            )}
            {shipment.status === 'DELIVERED' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/dispatch/${shipment.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'IN_TRANSIT' }),
                    })
                    if (!res.ok) throw new Error('Failed to reactivate')
                    toast.success('Tracking reactivated')
                    window.location.reload()
                  } catch {
                    toast.error('Failed to reactivate tracking')
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reactivate Tracking
              </Button>
            )}
            <ShareLinkButton shareCode={shipment.shareCode} trackingUrl={trackingUrl} />
            {isActive && (
              <CancelShipmentDialog
                shipmentId={shipment.id}
                shipmentName={shipment.name}
                apiBasePath="/api/v1/dispatch"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dispatched Labels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
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
                      <p className="font-mono text-sm font-medium">{label.deviceId}</p>
                      <p className="text-xs text-muted-foreground">{label.status}</p>
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
              <p className="text-sm text-muted-foreground">No labels in this dispatch</p>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Route Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-4 w-4" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <span className="text-xs font-bold text-blue-700 dark:text-blue-300">A</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Origin</p>
                  <p className="text-sm">{shipment.originAddress || 'Not specified'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">B</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Destination</p>
                  <p className="text-sm">{shipment.destinationAddress || 'Not specified'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delivery Info */}
          {shipment.deliveredAt && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                    <p className="font-medium">
                      {format(new Date(shipment.deliveredAt), 'PPP')}
                    </p>
                  </div>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Created */}
          <Card>
            <CardHeader>
              <CardTitle>Dispatch Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="text-sm">{format(new Date(shipment.createdAt), 'PPP')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Labels</p>
                <p className="text-sm">{labelCount} label{labelCount !== 1 ? 's' : ''}</p>
              </div>
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
                Share this link with your recipient to let them track the dispatch
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-muted px-3 py-2.5">
                <p className="break-all font-mono text-xs text-muted-foreground">{trackingUrl}</p>
              </div>
              <ShareLinkButton
                shareCode={shipment.shareCode}
                trackingUrl={trackingUrl}
                className="mt-3 w-full rounded-full"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
