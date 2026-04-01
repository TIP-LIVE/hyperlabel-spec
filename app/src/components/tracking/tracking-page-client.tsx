'use client'

import { useState, useCallback, useMemo } from 'react'
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
  Copy,
  Check,
  PartyPopper,
  Navigation,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { formatDateTime, formatDateTimeFull } from '@/lib/utils/format-date'
import { timeAgo } from '@/lib/utils/time-ago'
import { getLastUpdateDate } from '@/lib/utils/location-display'
import { PublicTrackingMap } from '@/components/maps/public-tracking-map'
import { PublicTimeline } from '@/components/tracking/public-timeline'
import { ConfirmDeliveryDialog } from '@/components/tracking/confirm-delivery-dialog'
import { ShipperAddressForm } from '@/components/tracking/shipper-address-form'
import type { ShipperAddressInput } from '@/lib/validations/address'
import { getCountryName } from '@/lib/constants/countries'
import { toast } from 'sonner'
import { Logo } from '@/components/ui/logo'
import { shipmentStatusConfig } from '@/lib/status-config'


interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: string | Date
  batteryPct: number | null
  accuracyM: number | null
  isOfflineSync?: boolean
  geocodedCity: string | null
  geocodedArea: string | null
  geocodedCountry: string | null
  geocodedCountryCode: string | null
  eventType?: string | null
}

interface ShipmentData {
  id: string
  type: 'CARGO_TRACKING' | 'LABEL_DISPATCH'
  name: string | null
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED'
  labelCount: number
  originAddress: string | null
  originLat: number | null
  originLng: number | null
  destinationAddress: string | null
  destinationLat: number | null
  destinationLng: number | null
  destinationName: string | null
  destinationLine1: string | null
  destinationLine2: string | null
  destinationCity: string | null
  destinationState: string | null
  destinationPostalCode: string | null
  destinationCountry: string | null
  addressSubmittedAt: string | null
  consigneeEmail: string | null
  consigneePhone: string | null
  deliveredAt: string | null
  createdAt: string
  label: {
    deviceId: string
    batteryPct: number | null
    lastSeenAt: string | null
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
  const [copied, setCopied] = useState(false)

  const statusInfo = shipmentStatusConfig[shipment.status]
  const StatusIcon = statusIcons[shipment.status] || Package
  const latestLocation = shipment.locations[0]
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'
  const isDispatch = shipment.type === 'LABEL_DISPATCH'

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
    if (pct === null) return { label: 'Pending', color: 'text-muted-foreground' }
    if (pct >= 50) return { label: 'Good', color: 'text-green-600 dark:text-green-400' }
    if (pct >= 20) return { label: 'Fair', color: 'text-yellow-600 dark:text-yellow-400' }
    return { label: 'Low', color: 'text-destructive' }
  }, [shipment.label?.batteryPct])

  // P0: Instant delivery state update — optimistic update
  const handleDeliveryConfirmed = useCallback(() => {
    setShipment((prev) => ({
      ...prev,
      status: 'DELIVERED' as const,
      deliveredAt: new Date().toISOString(),
    }))
  }, [])

  // Optimistic update after shipper submits address
  const handleAddressSubmitted = useCallback((data: ShipperAddressInput) => {
    const formatted = [data.name, data.line1, data.line2, data.city, data.state, data.postalCode, getCountryName(data.country)]
      .filter(Boolean)
      .join(', ')
    setShipment((prev) => ({
      ...prev,
      destinationAddress: formatted,
      destinationName: data.name,
      destinationLine1: data.line1,
      destinationLine2: data.line2 || null,
      destinationCity: data.city,
      destinationState: data.state || null,
      destinationPostalCode: data.postalCode,
      destinationCountry: data.country,
      consigneeEmail: data.email,
      consigneePhone: data.phone || null,
      addressSubmittedAt: new Date().toISOString(),
    }))
  }, [])

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
                {isDispatch ? 'Labels Delivered!' : 'Shipment Delivered!'}
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
            <h1 className="text-2xl font-bold">{shipment.name || (isDispatch ? 'Label Dispatch' : 'Shipment Tracking')}</h1>
            <p className="text-sm text-muted-foreground">
              Tracking code: <span className="font-mono">{code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
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
          </div>
        </div>

        {/* P0: Journey progress bar — cargo tracking only */}
        {journeyInfo && !isDispatch && (
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

        <div className={`grid gap-6 ${isDispatch ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          {/* Map + Timeline — cargo tracking only */}
          {!isDispatch && (
            <div className="min-w-0 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                  <CardDescription>
                    {(() => {
                      const lastUpdate = getLastUpdateDate({
                        locationRecordedAt: latestLocation?.recordedAt,
                        labelLastSeenAt: shipment.label?.lastSeenAt,
                      })
                      return lastUpdate
                        ? `Last updated ${timeAgo(lastUpdate)}`
                        : 'The tracking label is connecting. First location typically appears within a few minutes.'
                    })()}
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
                    currentLocationLabel={latestLocation?.geocodedCity || latestLocation?.geocodedArea || latestLocation?.geocodedCountry || null}
                    height="400px"
                    lastSeenAt={shipment.label?.lastSeenAt}
                  />
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card className="mt-6 overflow-hidden">
                <CardHeader className="px-3 sm:px-6">
                  <CardTitle>Location History</CardTitle>
                  <CardDescription>
                    {shipment.locations.length} location updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <PublicTimeline
                    locations={locationsWithDates.map((loc) => ({
                      id: loc.id,
                      latitude: loc.latitude,
                      longitude: loc.longitude,
                      recordedAt: loc.recordedAt,
                      accuracyM: loc.accuracyM,
                      batteryPct: loc.batteryPct,
                      isOfflineSync: loc.isOfflineSync ?? false,
                      geocodedCity: loc.geocodedCity,
                      geocodedArea: loc.geocodedArea,
                      geocodedCountry: loc.geocodedCountry,
                      geocodedCountryCode: loc.geocodedCountryCode,
                      eventType: loc.eventType,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Sidebar */}
          <div className={`space-y-6 ${isDispatch ? 'lg:col-span-2' : ''}`}>
            {/* Consignee Delivery Confirmation — only when in transit (not pending) */}
            {shipment.status === 'IN_TRANSIT' && !isDispatch && (
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

            {/* Shipper address form — dispatch pending, no address yet */}
            {isDispatch && shipment.status === 'PENDING' && !shipment.addressSubmittedAt && (
              <ShipperAddressForm shareCode={code} onSubmitted={handleAddressSubmitted} />
            )}

            {/* Submitted address — dispatch with address already submitted */}
            {isDispatch && shipment.addressSubmittedAt && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Delivery Address Submitted
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="font-medium">{shipment.destinationName}</p>
                  <p>{shipment.destinationLine1}</p>
                  {shipment.destinationLine2 && <p>{shipment.destinationLine2}</p>}
                  <p>
                    {[shipment.destinationCity, shipment.destinationState, shipment.destinationPostalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {shipment.destinationCountry && (
                    <p>{getCountryName(shipment.destinationCountry)}</p>
                  )}
                  {(shipment.consigneeEmail || shipment.consigneePhone) && (
                    <>
                      <div className="border-t pt-2 mt-2 space-y-1 text-muted-foreground">
                        {shipment.consigneeEmail && <p>{shipment.consigneeEmail}</p>}
                        {shipment.consigneePhone && <p>{shipment.consigneePhone}</p>}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* P1: Route Card — origin + destination (hidden when both empty) */}
            {(shipment.originAddress || shipment.destinationAddress) && (
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
                  {shipment.destinationAddress && (
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <span className="text-xs font-bold text-green-700 dark:text-green-300">B</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">To</p>
                        <p className="text-sm">{shipment.destinationAddress}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>{isDispatch ? 'Dispatch Info' : 'Shipment Info'}</CardTitle>
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
                        ? `Delivered ${formatDateTimeFull(shipment.deliveredAt)}`
                        : shipment.status === 'IN_TRANSIT'
                          ? 'On the way to destination'
                          : shipment.status === 'CANCELLED'
                            ? 'This shipment has been cancelled'
                            : isDispatch
                              ? 'Dispatch created — labels being shipped'
                              : 'Label activated — acquiring first location'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Dispatch: show label count; Cargo: show battery */}
                {isDispatch ? (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Labels</span>
                    <span className="text-sm font-medium">{shipment.labelCount}</span>
                  </div>
                ) : (
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
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="text-sm">
                    {formatDateTime(shipment.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* P1: Share tracking link */}
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm font-medium mb-2">{isDispatch ? 'Share Dispatch Link' : 'Share Tracking Link'}</p>
                <p className="text-xs text-muted-foreground mb-3">
                  {isDispatch
                    ? 'Send this link to anyone expecting this label delivery.'
                    : 'Send this link to anyone who needs to follow this shipment.'}
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
            {!isActive && !isDispatch && (
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
          <p>{isDispatch ? 'Powered by TIP' : 'Powered by TIP — door-to-door cargo tracking'}</p>
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
