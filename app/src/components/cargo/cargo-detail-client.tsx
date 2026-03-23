'use client'

import { useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Battery,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Share2,
  Truck,
  CheckCircle,
  RefreshCw,
  Navigation,
  ArrowRight,
  X,
} from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { formatDistanceToNow, format } from 'date-fns'
import { getLastUpdateDate } from '@/lib/utils/location-display'
import { ShipmentMap } from '@/components/maps/shipment-map'
import { ShipmentTimeline } from '@/components/shipments/shipment-timeline'
import { ShareLinkButton } from '@/components/shipments/share-link-button'
import { CancelShipmentDialog } from '@/components/shipments/cancel-shipment-dialog'
import { EditShipmentDialog } from '@/components/shipments/edit-shipment-dialog'
import { toast } from 'sonner'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { isNullIsland } from '@/lib/validations/device'


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
  eventType?: string | null
}

interface LabelInfo {
  deviceId: string
  batteryPct: number | null
  status: string
  firmwareVersion: string | null
  activatedAt: string | null
  lastSeenAt: string | null
}

interface CargoData {
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
  consigneeEmail: string | null
  consigneePhone: string | null
  photoUrls: string[]
  label: LabelInfo | null
  locations: LocationPoint[]
}

interface OldestLocationInfo {
  id: string
  latitude: number
  longitude: number
  recordedAt: string
  geocodedCity: string | null
  geocodedArea: string | null
  geocodedCountry: string | null
  geocodedCountryCode: string | null
}

interface CargoDetailClientProps {
  initialData: CargoData
  trackingUrl: string
  initialTotalLocations?: number
  initialOldestLocation?: OldestLocationInfo | null
  isAdmin?: boolean
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const, icon: Package },
  IN_TRANSIT: { label: 'In Transit', variant: 'default' as const, icon: Truck },
  DELIVERED: { label: 'Delivered', variant: 'success' as const, icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', variant: 'secondary' as const, icon: Package },
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

export function CargoDetailClient({ initialData, trackingUrl, initialTotalLocations, initialOldestLocation, isAdmin }: CargoDetailClientProps) {
  const [shipment, setShipment] = useState<CargoData>(initialData)
  const [totalLocations, setTotalLocations] = useState(initialTotalLocations ?? initialData.locations.length)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const statusInfo = statusConfig[shipment.status]
  const StatusIcon = statusInfo.icon
  const latestLocation = shipment.locations[0]
  const isActive = shipment.status === 'PENDING' || shipment.status === 'IN_TRANSIT'

  const currentGeo = useMemo(() => {
    if (!latestLocation) return null
    const { geocodedCity, geocodedCountry, geocodedCountryCode } = latestLocation
    if (!geocodedCity && !geocodedCountry) return null
    return {
      name: geocodedCity && geocodedCountry
        ? `${geocodedCity}, ${geocodedCountry}`
        : geocodedCity || geocodedCountry || null,
      country: geocodedCountry,
      countryCode: geocodedCountryCode,
    }
  }, [latestLocation])

  const journeyInfo = useMemo(() => {
    if (
      shipment.originLat == null || shipment.originLng == null ||
      shipment.destinationLat == null || shipment.destinationLng == null ||
      isNullIsland(shipment.originLat, shipment.originLng) ||
      isNullIsland(shipment.destinationLat, shipment.destinationLng)
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

  const originDisplay = useMemo(() => {
    if (shipment.originAddress) {
      return { label: shipment.originAddress, inferred: false }
    }
    if (shipment.originLat != null && shipment.originLng != null && !isNullIsland(shipment.originLat, shipment.originLng)) {
      return { label: `${shipment.originLat.toFixed(4)}, ${shipment.originLng.toFixed(4)}`, inferred: false }
    }
    // Use the actual oldest location (from full dataset) rather than the
    // oldest in the currently-loaded page, so origin stays stable during pagination
    const oldest = initialOldestLocation ?? (shipment.locations.length > 0 ? shipment.locations[shipment.locations.length - 1] : null)
    if (oldest) {
      const geo = oldest.geocodedCity && oldest.geocodedCountry
        ? `${oldest.geocodedCity}, ${oldest.geocodedCountry}`
        : oldest.geocodedCity || oldest.geocodedCountry || null
      if (geo) return { label: geo, inferred: true }
      return { label: `${oldest.latitude.toFixed(4)}, ${oldest.longitude.toFixed(4)}`, inferred: true }
    }
    return { label: 'Not specified', inferred: false }
  }, [shipment, initialOldestLocation])

  const destinationDisplay = useMemo(() => {
    if (shipment.destinationAddress) {
      return { label: shipment.destinationAddress, inferred: false }
    }
    if (shipment.destinationLat != null && shipment.destinationLng != null && !isNullIsland(shipment.destinationLat, shipment.destinationLng)) {
      return { label: `${shipment.destinationLat.toFixed(4)}, ${shipment.destinationLng.toFixed(4)}`, inferred: false }
    }
    return { label: 'Not specified', inferred: false }
  }, [shipment])

  const mergeLocations = useCallback((existing: LocationPoint[], incoming: LocationPoint[]) => {
    const existingIds = new Set(existing.map((l) => l.id))
    const newOnes = incoming.filter((l) => !existingIds.has(l.id))
    if (newOnes.length === 0) return existing
    return [...newOnes, ...existing].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    )
  }, [])

  const loadMore = useCallback(async () => {
    setLoadingMore(true)
    try {
      const res = await fetch(`/api/v1/cargo/${shipment.id}?limit=100&offset=${shipment.locations.length}`)
      if (!res.ok) return

      const data = await res.json()
      const older = data.shipment.locations as LocationPoint[]
      if (data.totalLocations != null) setTotalLocations(data.totalLocations)

      setShipment((prev) => ({
        ...prev,
        locations: mergeLocations(
          prev.locations,
          older.map((l: LocationPoint & { recordedAt: string | Date }) => ({
            ...l,
            recordedAt: typeof l.recordedAt === 'string' ? l.recordedAt : new Date(l.recordedAt).toISOString(),
          }))
        ),
      }))
    } catch {
      toast.error('Failed to load older locations')
    } finally {
      setLoadingMore(false)
    }
  }, [shipment.id, shipment.locations.length, mergeLocations])

  const OFFLINE_SYNC_THRESHOLD_MS = 5 * 60 * 1000

  const locationsWithDates = shipment.locations.map((l) => {
    const recordedAt = new Date(l.recordedAt)
    const receivedAt = l.receivedAt ? new Date(l.receivedAt) : null
    const isOfflineSync = receivedAt
      ? receivedAt.getTime() - recordedAt.getTime() > OFFLINE_SYNC_THRESHOLD_MS
      : l.isOfflineSync ?? false
    return { ...l, recordedAt, isOfflineSync }
  })

  return (
    <div className="space-y-6 min-w-0 overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cargo">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {shipment.name || 'Unnamed Cargo'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {shipment.label?.deviceId || '—'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
                apiBasePath="/api/v1/cargo"
              />
            )}
            {shipment.status === 'DELIVERED' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/cargo/${shipment.id}`, {
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
            {isAdmin && shipment.status === 'CANCELLED' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/v1/cargo/${shipment.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'PENDING' }),
                    })
                    if (!res.ok) throw new Error('Failed to reactivate')
                    toast.success('Shipment reactivated')
                    window.location.reload()
                  } catch {
                    toast.error('Failed to reactivate shipment')
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reactivate
              </Button>
            )}
            <ShareLinkButton shareCode={shipment.shareCode} trackingUrl={trackingUrl} />
            {isActive && (
              <CancelShipmentDialog
                shipmentId={shipment.id}
                shipmentName={shipment.name}
                apiBasePath="/api/v1/cargo"
              />
            )}
          </div>
        </div>
      </div>

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
              <span className="truncate max-w-[40%]" title={originDisplay.label}>
                {originDisplay.label}
              </span>
              <span className="truncate max-w-[40%] text-right" title={destinationDisplay.label}>
                {destinationDisplay.label}
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

      {/* Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Location
            {currentGeo?.countryCode && (
              <span className="text-base font-normal text-muted-foreground">
                {countryCodeToFlag(currentGeo.countryCode)} {currentGeo.country}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            {(() => {
              const lastUpdate = getLastUpdateDate({
                locationRecordedAt: latestLocation?.recordedAt,
                labelLastSeenAt: shipment.label?.lastSeenAt,
              })
              return lastUpdate
                ? `Last updated ${formatDistanceToNow(lastUpdate, { addSuffix: true })}`
                : 'Acquiring signal — first location typically appears within a few minutes'
            })()}
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
            currentLocationLabel={latestLocation?.geocodedCity || latestLocation?.geocodedArea || latestLocation?.geocodedCountry || null}
            height="450px"
            lastSeenAt={shipment.label?.lastSeenAt}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <CardHeader className="px-3 sm:px-6">
              <CardTitle>Location History</CardTitle>
              <CardDescription>
                {totalLocations > shipment.locations.length
                  ? `Showing ${shipment.locations.length} of ${totalLocations} location updates`
                  : `${shipment.locations.length} location updates`}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <ShipmentTimeline locations={locationsWithDates} />
              {shipment.locations.length < totalLocations && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="gap-2"
                  >
                    {loadingMore ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Clock className="h-3.5 w-3.5" />
                    )}
                    {loadingMore ? 'Loading...' : `Load older locations (${totalLocations - shipment.locations.length} more)`}
                  </Button>
                </div>
              )}
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
                  <p className="text-sm">{originDisplay.label}</p>
                  {originDisplay.inferred && (
                    <p className="text-xs text-muted-foreground/70 italic mt-0.5">First scan location</p>
                  )}
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
                  <p className="text-sm">{destinationDisplay.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cargo Photos */}
          {shipment.photoUrls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Cargo Photos
                </CardTitle>
                <CardDescription>
                  {shipment.photoUrls.length} photo{shipment.photoUrls.length > 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {shipment.photoUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="relative aspect-square overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Cargo photo ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Photo Lightbox */}
          <Dialog open={lightboxIndex !== null} onOpenChange={(open) => { if (!open) setLightboxIndex(null) }}>
            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none [&>button]:hidden">
              {lightboxIndex !== null && (
                <div className="relative flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shipment.photoUrls[lightboxIndex]}
                    alt={`Cargo photo ${lightboxIndex + 1}`}
                    className="max-h-[80vh] w-auto rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {shipment.photoUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex((lightboxIndex - 1 + shipment.photoUrls.length) % shipment.photoUrls.length)}
                        className="absolute left-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setLightboxIndex((lightboxIndex + 1) % shipment.photoUrls.length)}
                        className="absolute right-2 rounded-full bg-black/60 p-1.5 text-white transition-colors hover:bg-black/80"
                        style={{ top: '50%', transform: 'translateY(-50%)', right: '0.5rem' }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                        {lightboxIndex + 1} / {shipment.photoUrls.length}
                      </div>
                    </>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Delivery Info */}
          {shipment.deliveredAt && (
            <Card>
              <CardHeader>
                <CardTitle>Delivery Details</CardTitle>
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

          {/* Consignee Info */}
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

          {/* Label Info */}
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
                {shipment.label.batteryPct !== null && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Battery</p>
                        <p
                          className={`font-medium ${
                            shipment.label.batteryPct < 20 ? 'text-destructive' : ''
                          }`}
                        >
                          {shipment.label.batteryPct}%
                        </p>
                      </div>
                      <Battery
                        className={`h-4 w-4 ${
                          shipment.label.batteryPct < 20
                            ? 'text-destructive'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                  </>
                )}
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

          {/* Share Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share Tracking
              </CardTitle>
              <CardDescription>
                Share this link with your recipient to let them track the cargo
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
