'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Package,
  Battery,
  Truck,
  CheckCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  PartyPopper,
  Navigation,
  ArrowRight,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { PublicTrackingMap } from '@/components/maps/public-tracking-map'
import { PublicTimeline } from '@/components/tracking/public-timeline'
import { ConfirmDeliveryDialog } from '@/components/tracking/confirm-delivery-dialog'
import { toast } from 'sonner'
import { Logo } from '@/components/ui/logo'
import { shipmentStatusConfig } from '@/lib/status-config'

const POLL_INTERVAL_MS = 60_000 // 60 seconds

interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: string | Date
  batteryPct: number | null
  accuracyM: number | null
  isOfflineSync?: boolean
}

interface ShipmentData {
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
  label: {
    deviceId: string
    batteryPct: number | null
  } | null
  locations: LocationPoint[]
}

interface TrackingPageClientProps {
  code: string
  initialData: ShipmentData
}

const statusIcons: Record<string, typeof Package> = {
  PENDING: Package,
  IN_TRANSIT: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: Package,
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
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

export function TrackingPageClient({ code, initialData }: TrackingPageClientProps) {
  const [shipment, setShipment] = useState<ShipmentData>(initialData)
  const [isPolling] = useState(true)
  const [pollError, setPollError] = useState(false)
  const [copied, setCopied] = useState(false)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const statusInfo = shipmentStatusConfig[shipment.status]
  const StatusIcon = statusIcons[shipment.status] || Package
  const latestLocation = shipment.locations[0]
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'

  // Journey progress calculation
  const journeyInfo = useMemo(() => {
    if (
      shipment.originLat == null ||
      shipment.originLng == null ||
      shipment.destinationLat == null ||
      shipment.destinationLng == null
    ) {
      return null
    }

    const totalDistance = haversineKm(
      shipment.originLat,
      shipment.originLng,
      shipment.destinationLat,
      shipment.destinationLng
    )

    if (totalDistance < 1) return null // Too close, skip progress bar

    if (shipment.status === 'DELIVERED') {
      return { totalDistance, distanceRemaining: 0, progress: 100 }
    }

    if (!latestLocation) {
      return { totalDistance, distanceRemaining: totalDistance, progress: 0 }
    }

    const distanceRemaining = haversineKm(
      latestLocation.latitude,
      latestLocation.longitude,
      shipment.destinationLat,
      shipment.destinationLng
    )

    const progress = Math.min(
      100,
      Math.max(0, ((totalDistance - distanceRemaining) / totalDistance) * 100)
    )

    return { totalDistance, distanceRemaining, progress }
  }, [shipment, latestLocation])

  // Simplified battery status for consignee
  const batteryStatus = useMemo(() => {
    const pct = shipment.label?.batteryPct ?? null
    if (pct === null) return { label: 'Unknown', color: 'text-muted-foreground' }
    if (pct >= 50) return { label: 'Good', color: 'text-green-600 dark:text-green-400' }
    if (pct >= 20) return { label: 'Fair', color: 'text-yellow-600 dark:text-yellow-400' }
    return { label: 'Low', color: 'text-destructive' }
  }, [shipment.label?.batteryPct])

  // Merge new locations into the existing set (dedup by id)
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
      const since = latestLocation
        ? new Date(latestLocation.recordedAt).toISOString()
        : undefined
      const url = since
        ? `/api/v1/track/${code}?since=${encodeURIComponent(since)}`
        : `/api/v1/track/${code}`

      const res = await fetch(url)
      if (!res.ok) return

      const data = await res.json()
      const updated = data.shipment as ShipmentData

      setShipment((prev) => ({
        ...prev,
        status: updated.status,
        deliveredAt: updated.deliveredAt,
        label: updated.label,
        locations: mergeLocations(prev.locations, updated.locations),
      }))

      setPollError(false)
    } catch {
      setPollError(true)
    }
  }, [code, latestLocation, mergeLocations])

  // Derive polling state — avoid setState in effect body
  const isTerminal = shipment.status === 'DELIVERED' || shipment.status === 'CANCELLED'
  const shouldPoll = isPolling && !isTerminal

  // Set up polling interval
  useEffect(() => {
    if (!shouldPoll) return

    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [shouldPoll, poll])

  // P0: Instant delivery state update — optimistic update
  const handleDeliveryConfirmed = useCallback(() => {
    setShipment((prev) => ({
      ...prev,
      status: 'DELIVERED' as const,
      deliveredAt: new Date().toISOString(),
    }))
    // Also poll after a brief delay to get server-confirmed data
    setTimeout(() => {
      poll()
    }, 2000)
  }, [poll])

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    poll()
  }, [poll])

  // P1: Share/copy tracking link
  const handleCopyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/track/${code}`
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Tracking link copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy link')
    }
  }, [code])

  // Normalise dates for child components
  const locationsWithDates = shipment.locations.map((l) => ({
    ...l,
    recordedAt: new Date(l.recordedAt),
  }))

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-2">
            {isPolling && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                Live
              </div>
            )}
            <Badge variant={statusInfo.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusInfo.label}
            </Badge>
          </div>
        </div>
      </header>

      {/* P1: Delivery celebration banner */}
      {shipment.status === 'DELIVERED' && (
        <div className="border-b bg-green-50 dark:bg-green-950/30">
          <div className="container mx-auto flex items-center gap-3 px-4 py-3">
            <PartyPopper className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Shipment Delivered!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                {shipment.deliveredAt
                  ? `Delivered ${format(new Date(shipment.deliveredAt), 'PPp')}`
                  : 'Delivery confirmed'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">{shipment.name || 'Shipment Tracking'}</h1>
            <p className="text-sm text-muted-foreground">
              Tracking code: <span className="font-mono">{code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {latestLocation && (
              <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Updated {formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}
                </span>
              </div>
            )}
            {/* P1: Share button */}
            <button
              onClick={handleCopyLink}
              className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
              title="Copy tracking link"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            {isPolling && (
              <button
                onClick={handleManualRefresh}
                className="flex h-8 w-8 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                title="Refresh now"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {pollError && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
            Having trouble connecting. Data will refresh automatically.
          </div>
        )}

        {/* P0: Journey progress bar */}
        {journeyInfo && (
          <Card className="mb-6">
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
                {/* Truck icon at current position */}
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
                  locations={locationsWithDates.map((loc) => ({
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
                <PublicTimeline
                  locations={locationsWithDates.map((loc) => ({
                    id: loc.id,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    recordedAt: loc.recordedAt,
                    accuracyM: loc.accuracyM,
                    batteryPct: loc.batteryPct,
                    isOfflineSync: loc.isOfflineSync ?? false,
                  }))}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Consignee Delivery Confirmation — only when actively tracking */}
            {isActive && (
              <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    Received your shipment?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    If you are the recipient, confirm delivery to notify the shipper
                    and stop tracking.
                  </p>
                  <ConfirmDeliveryDialog
                    shareCode={code}
                    shipmentName={shipment.name}
                    onDeliveryConfirmed={handleDeliveryConfirmed}
                  />
                </CardContent>
              </Card>
            )}

            {/* P1: Route Card — origin + destination */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Route
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shipment.originAddress && (
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300">A</span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">From</p>
                      <p className="text-sm">{shipment.originAddress}</p>
                    </div>
                  </div>
                )}
                {shipment.originAddress && shipment.destinationAddress && (
                  <div className="flex items-center gap-3 pl-2">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    {journeyInfo && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(journeyInfo.totalDistance)} km
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">B</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">To</p>
                    <p className="text-sm">{shipment.destinationAddress || 'Not specified'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Shipment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      shipment.status === 'DELIVERED'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : shipment.status === 'IN_TRANSIT'
                          ? 'bg-blue-100 dark:bg-blue-900/30'
                          : 'bg-muted'
                    }`}
                  >
                    <StatusIcon
                      className={`h-5 w-5 ${
                        shipment.status === 'DELIVERED'
                          ? 'text-green-600 dark:text-green-400'
                          : shipment.status === 'IN_TRANSIT'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-muted-foreground'
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

                <Separator />

                {/* P0: Simplified device info — no raw device ID, battery as Good/Fair/Low */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tracker Battery</span>
                  <div className="flex items-center gap-1.5">
                    <Battery
                      className={`h-4 w-4 ${batteryStatus.color}`}
                    />
                    <span className={`text-sm font-medium ${batteryStatus.color}`}>
                      {batteryStatus.label}
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

            {/* P1: Share tracking link */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">Share Tracking Link</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Send this link to anyone who needs to follow this shipment.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* P2: CTA — only show when NOT actively tracking */}
            {!isActive && (
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6">
                  <p className="font-medium">Need to track your own cargo?</p>
                  <p className="mt-1 text-sm opacity-90">
                    Door-to-door tracking labels for your valuable shipments.
                  </p>
                  <Button variant="secondary" className="mt-4 w-full" asChild>
                    <Link href="/sign-up">Get Started</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by TIP — door-to-door cargo tracking</p>
          <p className="mt-1">
            <Link href="/" className="hover:underline">
              tip.live
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
