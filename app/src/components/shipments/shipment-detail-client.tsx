'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Battery,
  Clock,
  MapPin,
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
import { ShipmentMap } from '@/components/maps/shipment-map'
import { ShipmentTimeline } from '@/components/shipments/shipment-timeline'
import { ShareLinkButton } from '@/components/shipments/share-link-button'
import { CancelShipmentDialog } from '@/components/shipments/cancel-shipment-dialog'
import { EditShipmentDialog } from '@/components/shipments/edit-shipment-dialog'
import { toast } from 'sonner'
import { useReverseGeocode } from '@/hooks/use-reverse-geocode'
import { countryCodeToFlag } from '@/lib/utils/country-flag'

const POLL_INTERVAL_MS = 30_000 // 30 seconds for shipper (faster than consignee)

interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: string
  receivedAt?: string
  batteryPct: number | null
  accuracyM: number | null
  altitude?: number | null
  speed?: number | null
  isOfflineSync?: boolean
}

interface LabelInfo {
  deviceId: string
  batteryPct: number | null
  status: string
  firmwareVersion: string | null
  activatedAt: string | null
}

interface ShipmentData {
  id: string
  type: 'CARGO_TRACKING' | 'LABEL_DISPATCH'
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
  consigneeEmail: string | null
  consigneePhone: string | null
  label: LabelInfo | null
  shipmentLabels?: LabelInfo[]
  locations: LocationPoint[]
}

interface ShipmentDetailClientProps {
  initialData: ShipmentData
  trackingUrl: string
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const, icon: Package },
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function ShipmentDetailClient({ initialData, trackingUrl }: ShipmentDetailClientProps) {
  const [shipment, setShipment] = useState<ShipmentData>(initialData)
  const [isPolling] = useState(true)
  const [pollError, setPollError] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const latestLocation = shipment.locations[0]
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'

  // Reverse geocode the latest location for the hero banner
  const latestLocArray = useMemo(
    () =>
      latestLocation
        ? [{ id: 'latest', latitude: latestLocation.latitude, longitude: latestLocation.longitude }]
        : [],
    [latestLocation]
  )
  const geoNames = useReverseGeocode(latestLocArray, 1)
  const currentGeo = geoNames['latest']

  // Journey progress
  const journeyInfo = useMemo(() => {
    if (
      shipment.originLat == null || shipment.originLng == null ||
      shipment.destinationLat == null || shipment.destinationLng == null
    ) return null

    const totalDistance = haversineKm(
      shipment.originLat, shipment.originLng,
      shipment.destinationLat, shipment.destinationLng
    )
    if (totalDistance < 1) return null

    if (shipment.status === 'DELIVERED') {
      return { totalDistance, distanceRemaining: 0, progress: 100 }
    }

    if (!latestLocation) {
      return { totalDistance, distanceRemaining: totalDistance, progress: 0 }
    }

    const distanceRemaining = haversineKm(
      latestLocation.latitude, latestLocation.longitude,
      shipment.destinationLat, shipment.destinationLng
    )

    const progress = Math.min(100, Math.max(0, ((totalDistance - distanceRemaining) / totalDistance) * 100))
    return { totalDistance, distanceRemaining, progress }
  }, [shipment, latestLocation])

  // Merge locations
  const mergeLocations = useCallback((existing: LocationPoint[], incoming: LocationPoint[]) => {
    const existingIds = new Set(existing.map((l) => l.id))
    const newOnes = incoming.filter((l) => !existingIds.has(l.id))
    if (newOnes.length === 0) return existing
    return [...newOnes, ...existing].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )
  }, [])

  // Poll for updates
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/shipments/${shipment.id}`)
      if (!res.ok) return

      const data = await res.json()
      const updated = data.shipment

      setShipment((prev) => ({
        ...prev,
        name: updated.name,
        status: updated.status,
        deliveredAt: updated.deliveredAt,
        originAddress: updated.originAddress,
        originLat: updated.originLat,
        originLng: updated.originLng,
        destinationAddress: updated.destinationAddress,
        destinationLat: updated.destinationLat,
        destinationLng: updated.destinationLng,
        label: updated.label ? {
          ...prev.label,
          ...updated.label,
        } : prev.label,
        locations: mergeLocations(
          prev.locations,
          updated.locations.map((l: LocationPoint & { recordedAt: string | Date }) => ({
            ...l,
            recordedAt: typeof l.recordedAt === 'string' ? l.recordedAt : new Date(l.recordedAt).toISOString(),
          }))
        ),
      }))

      setPollError(false)
    } catch {
      setPollError(true)
    }
  }, [shipment.id, mergeLocations])

  // Derive polling state from shipment status instead of calling setState in effect
  const shouldPoll = isActive && isPolling

  useEffect(() => {
    if (!shouldPoll) return

    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [shouldPoll, poll])

  const handleManualRefresh = useCallback(() => { poll() }, [poll])

  const OFFLINE_SYNC_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

  const locationsWithDates = shipment.locations.map((l) => {
    const recordedAt = new Date(l.recordedAt)
    const receivedAt = l.receivedAt ? new Date(l.receivedAt) : null
    // Offline sync = gap between device recording and server receiving > 5 min
    const isOfflineSync = receivedAt
      ? receivedAt.getTime() - recordedAt.getTime() > OFFLINE_SYNC_THRESHOLD_MS
      : l.isOfflineSync ?? false
    return {
      ...l,
      recordedAt,
      isOfflineSync,
    }
  })

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {shipment.name || (shipment.type === 'LABEL_DISPATCH' ? 'Unnamed Dispatch' : 'Unnamed Cargo')}
              </h1>
              {shipment.type === 'LABEL_DISPATCH' && (
                <Badge variant="secondary" className="gap-1">
                  <Send className="h-3 w-3" />
                  Dispatch
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {shipment.type === 'LABEL_DISPATCH'
                ? `${shipment.shipmentLabels?.length || 0} labels`
                : shipment.label?.deviceId || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isPolling && (
            <div className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
              <button
                onClick={handleManualRefresh}
                className="ml-1 rounded-full p-0.5 transition-colors hover:bg-accent"
                title="Refresh now"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          )}
          <Badge variant={statusInfo.variant} className="gap-1 px-3 py-1">
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
          <div className="flex items-center gap-1.5">
            {isActive && (
              <EditShipmentDialog
                shipmentId={shipment.id}
                currentName={shipment.name}
                currentOrigin={shipment.originAddress}
                currentDestination={shipment.destinationAddress}
              />
            )}
            <ShareLinkButton shareCode={shipment.shareCode} trackingUrl={trackingUrl} />
            {isActive && (
              <CancelShipmentDialog
                shipmentId={shipment.id}
                shipmentName={shipment.name}
              />
            )}
          </div>
        </div>
      </div>

      {pollError && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
          Having trouble connecting. Data will refresh automatically.
        </div>
      )}

      {/* Current Location Hero Banner */}
      {latestLocation && (
        <div className="flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm">
          {currentGeo?.countryCode ? (
            <span className="text-4xl leading-none">{countryCodeToFlag(currentGeo.countryCode)}</span>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-lg font-semibold truncate">
              {currentGeo?.name || `${latestLocation.latitude.toFixed(4)}, ${latestLocation.longitude.toFixed(4)}`}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              <span>
                {formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${latestLocation.latitude.toFixed(6)}, ${latestLocation.longitude.toFixed(6)}`)
              toast.success('Coordinates copied')
            }}
            className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Copy coordinates"
          >
            <Navigation className="h-3 w-3" />
            Copy
          </button>
        </div>
      )}

      {/* Journey progress bar */}
      {journeyInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span className="truncate max-w-[40%]" title={shipment.originAddress || 'Origin'}>
                {shipment.originAddress || 'Origin'}
              </span>
              <span className="truncate max-w-[40%] text-right" title={shipment.destinationAddress || 'Destination'}>
                {shipment.destinationAddress || 'Destination'}
              </span>
            </div>
            <div className="relative">
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${journeyInfo.progress}%` }}
                />
              </div>
              {shipment.status !== 'DELIVERED' && (
                <div
                  className="absolute -top-2 transition-all duration-700"
                  style={{ left: `calc(${journeyInfo.progress}% - 10px)` }}
                >
                  <Truck className="h-6 w-6 text-primary" />
                </div>
              )}
              {shipment.status === 'DELIVERED' && (
                <div className="absolute -top-2 right-0">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{Math.round(journeyInfo.totalDistance)} km total</span>
              {shipment.status === 'DELIVERED' ? (
                <span className="text-green-600 dark:text-green-400 font-medium">Arrived</span>
              ) : (
                <span>{Math.round(journeyInfo.distanceRemaining)} km remaining</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live Map — full width, taller */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Live Location
            {currentGeo?.countryCode && (
              <span className="text-base font-normal text-muted-foreground">
                {countryCodeToFlag(currentGeo.countryCode)} {currentGeo.country}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {latestLocation
              ? `Last updated ${formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}`
              : 'No location data yet'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShipmentMap
            locations={locationsWithDates.map((loc) => ({
              id: loc.id,
              latitude: loc.latitude,
              longitude: loc.longitude,
              recordedAt: loc.recordedAt,
              batteryPct: loc.batteryPct,
              accuracyM: loc.accuracyM,
            }))}
            originLat={shipment.originLat}
            originLng={shipment.originLng}
            originAddress={shipment.originAddress}
            destinationLat={shipment.destinationLat}
            destinationLng={shipment.destinationLng}
            destinationAddress={shipment.destinationAddress}
            height="450px"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Location History</CardTitle>
              <CardDescription>
                {shipment.locations.length} location events recorded. New points appear when the
                tracking device sends reports to the server (via cellular or when it syncs after
                being offline). If you don&apos;t see new updates, the device may be off, out of
                coverage, or the report endpoint may not be receiving data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShipmentTimeline locations={locationsWithDates} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
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
              {journeyInfo && (
                <div className="flex items-center gap-3 pl-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">
                    {Math.round(journeyInfo.totalDistance)} km
                  </span>
                </div>
              )}
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

          {/* Shipment Info — only show when there's delivery info */}
          {shipment.deliveredAt && (
            <Card>
              <CardHeader>
                <CardTitle>Shipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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

          {/* Consignee Info — only show if email or phone is set */}
          {(shipment.consigneeEmail || shipment.consigneePhone) && (
            <Card>
              <CardHeader>
                <CardTitle>Consignee</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {shipment.consigneeEmail && (
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{shipment.consigneeEmail}</p>
                  </div>
                )}
                {shipment.consigneePhone && (
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{shipment.consigneePhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Label Info — single label for cargo, list for dispatch */}
          {shipment.label && (
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
                  <Battery
                    className={`h-4 w-4 ${
                      (shipment.label.batteryPct ?? 100) < 20
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }`}
                  />
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
          )}

          {/* Dispatch Labels List */}
          {shipment.type === 'LABEL_DISPATCH' && shipment.shipmentLabels && shipment.shipmentLabels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Dispatched Labels ({shipment.shipmentLabels.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

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
