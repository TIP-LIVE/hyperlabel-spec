'use client'

import { GoogleMap, Marker, Polyline, InfoWindow, OverlayView, Circle } from '@react-google-maps/api'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns'
import { MapPin, LocateFixed, Radio } from 'lucide-react'
import { isNullIsland } from '@/lib/validations/device'

interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: Date
  batteryPct: number | null
  accuracyM: number | null
}

interface TrackingMapProps {
  locations: LocationPoint[]
  originLat?: number | null
  originLng?: number | null
  originAddress?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  destinationAddress?: string | null
  height?: string
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
}

const defaultCenter = {
  lat: 51.5074,
  lng: -0.1278,
}

// Default accuracy radius for cell tower triangulation (~750m)
// Used when accuracyM is not available on a location point
const DEFAULT_CELL_TOWER_ACCURACY_M = 750

const lightStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
]

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  {
    featureType: 'administrative.country',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3a3a4e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#b0b0c0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a2a3e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1a2e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3a3a5e' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6a6a7a' }],
  },
  {
    featureType: 'transit',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1525' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4a5568' }],
  },
]

// ── Clustering utilities ──

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

interface StopCluster {
  type: 'stop'
  centroidLat: number
  centroidLng: number
  points: LocationPoint[]
  arrivalTime: Date
  departureTime: Date
  dwellMinutes: number
}

interface TransitPoint {
  type: 'transit'
  point: LocationPoint
}

type Segment = StopCluster | TransitPoint

const CLUSTER_RADIUS_KM = 1.0

function clusterLocations(points: LocationPoint[]): Segment[] {
  if (points.length === 0) return []

  const segments: Segment[] = []
  let clusterPoints: LocationPoint[] = [points[0]]
  let centroidLat = points[0].latitude
  let centroidLng = points[0].longitude

  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    const dist = haversineKm(centroidLat, centroidLng, p.latitude, p.longitude)

    if (dist <= CLUSTER_RADIUS_KM) {
      clusterPoints.push(p)
      const n = clusterPoints.length
      centroidLat = ((centroidLat * (n - 1)) + p.latitude) / n
      centroidLng = ((centroidLng * (n - 1)) + p.longitude) / n
    } else {
      // Finalize current cluster
      segments.push(finalizeCluster(clusterPoints, centroidLat, centroidLng))
      clusterPoints = [p]
      centroidLat = p.latitude
      centroidLng = p.longitude
    }
  }
  // Finalize last cluster
  segments.push(finalizeCluster(clusterPoints, centroidLat, centroidLng))

  return mergeNearbyClusters(segments)
}

// Merge stop clusters whose centroids are within CLUSTER_RADIUS_KM of each other.
// When the device revisits the same place (A → B → A), the sequential algorithm
// produces separate clusters. This pass collapses them into a single stop with
// the summed dwell time, keeping only one marker per physical location.
function mergeNearbyClusters(segments: Segment[]): Segment[] {
  const stops = segments.filter((s): s is StopCluster => s.type === 'stop')
  const merged = new Set<number>() // indices into `stops` that were absorbed

  // For each pair of stops, merge if centroids are close
  for (let i = 0; i < stops.length; i++) {
    if (merged.has(i)) continue
    for (let j = i + 1; j < stops.length; j++) {
      if (merged.has(j)) continue
      const dist = haversineKm(
        stops[i].centroidLat, stops[i].centroidLng,
        stops[j].centroidLat, stops[j].centroidLng,
      )
      if (dist <= CLUSTER_RADIUS_KM) {
        // Absorb j into i
        const allPoints = [...stops[i].points, ...stops[j].points]
        const n = allPoints.length
        stops[i] = {
          type: 'stop',
          centroidLat: allPoints.reduce((s, p) => s + p.latitude, 0) / n,
          centroidLng: allPoints.reduce((s, p) => s + p.longitude, 0) / n,
          points: allPoints,
          arrivalTime: stops[i].arrivalTime < stops[j].arrivalTime ? stops[i].arrivalTime : stops[j].arrivalTime,
          departureTime: stops[i].departureTime > stops[j].departureTime ? stops[i].departureTime : stops[j].departureTime,
          dwellMinutes: stops[i].dwellMinutes + stops[j].dwellMinutes,
        }
        merged.add(j)
      }
    }
  }

  // Collect surviving stops by their original index in `segments`
  const survivingStops = new Map<StopCluster, StopCluster>()
  let stopIdx = 0
  for (const seg of segments) {
    if (seg.type === 'stop') {
      if (!merged.has(stopIdx)) {
        survivingStops.set(seg, stops[stopIdx])
      }
      stopIdx++
    }
  }

  // Rebuild segment list preserving transit order, replacing/removing stops
  const result: Segment[] = []
  const emitted = new Set<StopCluster>()
  for (const seg of segments) {
    if (seg.type === 'transit') {
      result.push(seg)
    } else if (survivingStops.has(seg)) {
      const merged = survivingStops.get(seg)!
      if (!emitted.has(merged)) {
        result.push(merged)
        emitted.add(merged)
      }
    }
    // Absorbed stops are dropped
  }

  return result
}

function finalizeCluster(points: LocationPoint[], centroidLat: number, centroidLng: number): Segment {
  if (points.length === 1) {
    return { type: 'transit', point: points[0] }
  }
  const arrival = new Date(points[0].recordedAt)
  const departure = new Date(points[points.length - 1].recordedAt)
  return {
    type: 'stop',
    centroidLat,
    centroidLng,
    points,
    arrivalTime: arrival,
    departureTime: departure,
    dwellMinutes: differenceInMinutes(departure, arrival),
  }
}

function formatDwell(minutes: number): string {
  if (minutes < 1) return '<1m'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 60 * 24) {
    const h = minutes / 60
    return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1).replace(/\.0$/, '')}h`
  }
  const d = minutes / (60 * 24)
  return d >= 10 ? `${Math.round(d)}d` : `${d.toFixed(1).replace(/\.0$/, '')}d`
}

export function TrackingMap({
  locations,
  originLat,
  originLng,
  originAddress,
  destinationLat,
  destinationLng,
  destinationAddress,
  height = '400px',
}: TrackingMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<StopCluster | null>(null)
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const [legendOpen, setLegendOpen] = useState(false)
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null)
  const [locating, setLocating] = useState(false)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  useEffect(() => {
    if (mapRef) {
      mapRef.setOptions({
        styles: isDark ? darkStyles : lightStyles,
      })
    }
  }, [isDark, mapRef])

  const latestLocation = locations[0]
  const hasOrigin = originLat != null && originLng != null && !isNullIsland(originLat, originLng)
  const hasDestination = destinationLat != null && destinationLng != null && !isNullIsland(destinationLat, destinationLng)

  const center = useMemo(() => {
    if (latestLocation) {
      return { lat: latestLocation.latitude, lng: latestLocation.longitude }
    }
    if (hasDestination) {
      return { lat: destinationLat!, lng: destinationLng! }
    }
    if (hasOrigin) {
      return { lat: originLat!, lng: originLng! }
    }
    return defaultCenter
  }, [latestLocation, hasDestination, destinationLat, destinationLng, hasOrigin, originLat, originLng])

  // Cluster sequential nearby points into stops
  const segments = useMemo(() => {
    if (locations.length <= 2) return [] // Skip clustering for 0-2 locations
    const historical = [...locations.slice(1)].reverse() // oldest-first, exclude current
    return clusterLocations(historical)
  }, [locations])

  // Build simplified path connecting segment centroids + current location
  const simplifiedPath = useMemo(() => {
    if (segments.length === 0) {
      // Fallback: raw path for 0-2 locations
      const reversed = [...locations].reverse()
      return reversed.map((loc) => ({ lat: loc.latitude, lng: loc.longitude }))
    }
    const path = segments.map((seg) =>
      seg.type === 'stop'
        ? { lat: seg.centroidLat, lng: seg.centroidLng }
        : { lat: seg.point.latitude, lng: seg.point.longitude }
    )
    // Connect to current location
    if (latestLocation) {
      path.push({ lat: latestLocation.latitude, lng: latestLocation.longitude })
    }
    return path
  }, [segments, locations, latestLocation])

  // The oldest location / first segment for the start marker
  const oldestLocation = locations.length > 0 ? locations[locations.length - 1] : null
  const firstSegment = segments.length > 0 ? segments[0] : null

  // Dashed line from current location to destination (remaining route)
  const remainingPath = useMemo(() => {
    if (!hasDestination || !latestLocation) return []
    return [
      { lat: latestLocation.latitude, lng: latestLocation.longitude },
      { lat: destinationLat!, lng: destinationLng! },
    ]
  }, [hasDestination, latestLocation, destinationLat, destinationLng])

  const mapOptions: google.maps.MapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      styles: isDark ? darkStyles : lightStyles,
    }),
    [isDark]
  )

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map)

      if (locations.length > 0 || hasDestination) {
        const bounds = new google.maps.LatLngBounds()
        locations.forEach((loc) => {
          bounds.extend({ lat: loc.latitude, lng: loc.longitude })
        })
        if (hasDestination) {
          bounds.extend({ lat: destinationLat!, lng: destinationLng! })
        }
        map.fitBounds(bounds, 60)
      }
    },
    [locations, hasDestination, destinationLat, destinationLng]
  )

  const onUnmount = useCallback(() => {
    setMapRef(null)
  }, [])

  const locateUser = useCallback(() => {
    if (!navigator.geolocation || !mapRef) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        mapRef.panTo(loc)
        mapRef.setZoom(14)
        setLocating(false)
      },
      () => {
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [mapRef])

  if (locations.length === 0 && !hasDestination && !hasOrigin) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/50"
        style={{ height }}
      >
        <Radio className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Acquiring GPS signal</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            The tracking label is powering on and connecting. First location typically appears within a few minutes.
          </p>
        </div>
      </div>
    )
  }

  // Origin/destination set but no actual tracking events yet
  if (locations.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed bg-muted/50"
        style={{ height }}
      >
        <Radio className="h-8 w-8 text-muted-foreground/40 animate-pulse" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Acquiring GPS signal</p>
          <p className="text-xs text-muted-foreground/70">
            The label is connecting to the network. First location typically appears within a few minutes. This page updates automatically.
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-lg bg-background/80 px-4 py-3 text-sm">
          {hasOrigin && (
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">A</span>
              </div>
              <span className="text-muted-foreground truncate max-w-[250px]">
                {originAddress || 'Origin set'}
              </span>
            </div>
          )}
          {hasDestination && (
            <div className="flex items-center gap-2">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <span className="text-[10px] font-bold text-red-700 dark:text-red-300">B</span>
              </div>
              <span className="text-muted-foreground truncate max-w-[250px]">
                {destinationAddress || 'Destination set'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ height, touchAction: 'none' }} className="relative overflow-hidden rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* ── Completed route: solid line with direction arrows ── */}
        {simplifiedPath.length > 1 && (
          <Polyline
            path={simplifiedPath}
            options={{
              strokeColor: isDark ? '#60a5fa' : '#3b82f6',
              strokeOpacity: 0.85,
              strokeWeight: 3,
              geodesic: true,
              icons: [
                {
                  icon: {
                    path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                    scale: 2.5,
                    fillColor: isDark ? '#60a5fa' : '#3b82f6',
                    fillOpacity: 1,
                    strokeWeight: 0,
                  },
                  offset: '50px',
                  repeat: '120px',
                },
              ],
            }}
          />
        )}

        {/* ── Remaining route: dashed line from current location to destination ── */}
        {remainingPath.length === 2 && (
          <Polyline
            path={remainingPath}
            options={{
              strokeColor: isDark ? '#60a5fa' : '#3b82f6',
              strokeOpacity: 0,
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 0.4,
                    strokeWeight: 2.5,
                    scale: 3,
                  },
                  offset: '0',
                  repeat: '14px',
                },
              ],
              geodesic: true,
            }}
          />
        )}

        {/* ── Start marker (first actual GPS data point or first cluster centroid) ── */}
        {mapRef && oldestLocation && locations.length > 1 && (
          <OverlayView
            position={
              firstSegment?.type === 'stop'
                ? { lat: firstSegment.centroidLat, lng: firstSegment.centroidLng }
                : { lat: oldestLocation.latitude, lng: oldestLocation.longitude }
            }
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="pointer-events-none flex flex-col items-center" style={{ transform: 'translate(-50%, -50%)' }}>
              <div
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg"
                style={{
                  backgroundColor: isDark ? '#059669' : '#047857',
                  color: '#fff',
                  marginBottom: 4,
                  border: '2px solid rgba(255,255,255,0.9)',
                }}
              >
                Start
              </div>
              <div className="relative flex items-center justify-center" style={{ width: 18, height: 18 }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: isDark ? '#34d399' : '#10b981',
                    border: '3px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
          </OverlayView>
        )}

        {/* ── Clustered stop markers ── */}
        {segments.length > 0
          ? segments.map((seg, i) =>
              seg.type === 'stop' ? (
                <OverlayView
                  key={`stop-${i}`}
                  position={{ lat: seg.centroidLat, lng: seg.centroidLng }}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                  <div
                    className="flex cursor-pointer items-center justify-center"
                    style={{ transform: 'translate(-50%, -50%)' }}
                    onClick={() => {
                      setSelectedCluster(seg)
                      setSelectedLocation(null)
                    }}
                  >
                    <div
                      className="rounded-full shadow-lg"
                      style={{
                        width: 14,
                        height: 14,
                        backgroundColor: isDark ? '#d97706' : '#f59e0b',
                        border: '2.5px solid rgba(255,255,255,0.95)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    />
                  </div>
                </OverlayView>
              ) : (
                <Marker
                  key={`transit-${seg.point.id}`}
                  position={{ lat: seg.point.latitude, lng: seg.point.longitude }}
                  onClick={() => {
                    setSelectedLocation(seg.point)
                    setSelectedCluster(null)
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 4,
                    fillColor: isDark ? '#60a5fa' : '#3b82f6',
                    fillOpacity: 0.6,
                    strokeColor: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)',
                    strokeWeight: 1.5,
                  }}
                />
              )
            )
          : /* Fallback: raw markers for ≤2 locations */
            locations.slice(1).map((location) => (
              <Marker
                key={location.id}
                position={{ lat: location.latitude, lng: location.longitude }}
                onClick={() => setSelectedLocation(location)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 5,
                  fillColor: isDark ? '#60a5fa' : '#3b82f6',
                  fillOpacity: 0.7,
                  strokeColor: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.9)',
                  strokeWeight: 2,
                }}
              />
            ))}

        {/* ── Current location: pulsing blue dot ── */}
        {mapRef && latestLocation && (
          <OverlayView
            position={{ lat: latestLocation.latitude, lng: latestLocation.longitude }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative flex items-center justify-center">
              {/* Pulsing ring */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full"
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: isDark ? 'rgba(96,165,250,0.25)' : 'rgba(59,130,246,0.25)',
                }}
              />
              {/* Outer ring */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  backgroundColor: isDark ? '#60a5fa' : '#3b82f6',
                  border: '3px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 2px 10px rgba(59,130,246,0.5)',
                }}
              />
              {/* Inner white dot */}
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ width: 8, height: 8, backgroundColor: '#fff' }}
              />
            </div>
          </OverlayView>
        )}

        {/* ── Accuracy radius circle for current location ── */}
        {latestLocation && (
          <Circle
            center={{ lat: latestLocation.latitude, lng: latestLocation.longitude }}
            radius={latestLocation.accuracyM || DEFAULT_CELL_TOWER_ACCURACY_M}
            options={{
              fillColor: isDark ? '#60a5fa' : '#3b82f6',
              fillOpacity: 0.08,
              strokeColor: isDark ? '#60a5fa' : '#3b82f6',
              strokeOpacity: 0.3,
              strokeWeight: 1.5,
              clickable: false,
            }}
          />
        )}

        {/* ── Accuracy radius circle for selected (clicked) location ── */}
        {selectedLocation && selectedLocation.id !== latestLocation?.id && (
          <Circle
            center={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
            radius={selectedLocation.accuracyM || DEFAULT_CELL_TOWER_ACCURACY_M}
            options={{
              fillColor: isDark ? '#60a5fa' : '#3b82f6',
              fillOpacity: 0.06,
              strokeColor: isDark ? '#60a5fa' : '#3b82f6',
              strokeOpacity: 0.2,
              strokeWeight: 1,
              clickable: false,
            }}
          />
        )}

        {/* Invisible click target for current location */}
        {latestLocation && (
          <Marker
            position={{ lat: latestLocation.latitude, lng: latestLocation.longitude }}
            onClick={() => setSelectedLocation(latestLocation)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: 'transparent',
              fillOpacity: 0,
              strokeColor: 'transparent',
              strokeWeight: 0,
            }}
          />
        )}

        {/* ── Destination marker ── */}
        {mapRef && hasDestination && (
          <OverlayView
            position={{ lat: destinationLat!, lng: destinationLng! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="pointer-events-none flex flex-col items-center" style={{ transform: 'translate(-50%, -50%)' }}>
              <div
                className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg"
                style={{
                  backgroundColor: isDark ? '#c2410c' : '#9a3412',
                  color: '#fff',
                  marginBottom: 4,
                  border: '2px solid rgba(255,255,255,0.9)',
                }}
              >
                {destinationAddress ? destinationAddress.split(',')[0] : 'Destination'}
              </div>
              <div className="relative flex items-center justify-center" style={{ width: 18, height: 18 }}>
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: isDark ? '#fb923c' : '#f97316',
                    border: '3px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
                <div
                  className="absolute rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </div>
          </OverlayView>
        )}

        {/* ── User location marker ── */}
        {mapRef && userLocation && (
          <OverlayView
            position={userLocation}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative flex items-center justify-center">
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: 'rgba(168,85,247,0.25)',
                }}
              />
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 16,
                  height: 16,
                  backgroundColor: '#a855f7',
                  border: '3px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 2px 8px rgba(168,85,247,0.5)',
                }}
              />
            </div>
          </OverlayView>
        )}

        {/* ── Info window for clicked single location ── */}
        {selectedLocation && (
          <InfoWindow
            position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
            onCloseClick={() => setSelectedLocation(null)}
            options={{ maxWidth: 280 }}
          >
            <div style={{ padding: '4px 2px', fontFamily: 'system-ui, sans-serif' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: '6px',
                }}
              >
                {format(new Date(selectedLocation.recordedAt), 'PPp')}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  marginBottom: '2px',
                }}
              >
                {formatDistanceToNow(new Date(selectedLocation.recordedAt), { addSuffix: true })}
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px',
                  fontSize: '12px',
                  color: '#374151',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                {selectedLocation.batteryPct !== null && (
                  <span>🔋 {selectedLocation.batteryPct}%</span>
                )}
                <span>📍 ±{selectedLocation.accuracyM || DEFAULT_CELL_TOWER_ACCURACY_M}m</span>
              </div>
            </div>
          </InfoWindow>
        )}

        {/* ── Info window for clicked stop cluster ── */}
        {selectedCluster && (
          <InfoWindow
            position={{ lat: selectedCluster.centroidLat, lng: selectedCluster.centroidLng }}
            onCloseClick={() => setSelectedCluster(null)}
            options={{ maxWidth: 300 }}
          >
            <div style={{ padding: '4px 2px', fontFamily: 'system-ui, sans-serif' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#92400e',
                  marginBottom: '6px',
                }}
              >
                Stopped for {formatDwell(selectedCluster.dwellMinutes)}
              </div>
              <div style={{ fontSize: '12px', color: '#374151', marginBottom: '4px' }}>
                {format(new Date(selectedCluster.arrivalTime), 'PPp')}
                {' '}&#8594;{' '}
                {format(new Date(selectedCluster.departureTime), 'p')}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
                {selectedCluster.points.length} location readings
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}
              >
                {(() => {
                  const batteries = selectedCluster.points
                    .map((p) => p.batteryPct)
                    .filter((b): b is number => b !== null)
                  if (batteries.length > 0) {
                    const min = Math.min(...batteries)
                    const max = Math.max(...batteries)
                    return <span>🔋 {min === max ? `${min}%` : `${min}% - ${max}%`}</span>
                  }
                  return null
                })()}
                <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                  {selectedCluster.centroidLat.toFixed(5)}, {selectedCluster.centroidLng.toFixed(5)}
                </span>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ── Map legend (collapsible) ── */}
      <button
        type="button"
        onClick={() => setLegendOpen((v) => !v)}
        className="absolute bottom-3 left-3 z-10 rounded-lg border bg-background/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur-sm transition-all"
      >
        {legendOpen ? (
          <div className="flex flex-col gap-1.5">
            {oldestLocation && locations.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Start</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">Current</span>
            </div>
            {segments.some((s) => s.type === 'stop') && (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Stop</span>
              </div>
            )}
            {hasDestination && (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Destination</span>
              </div>
            )}
            {userLocation && (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">You</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px]">&#9654;&#9654;</span>
              <span className="text-muted-foreground">Direction</span>
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">Legend</span>
        )}
      </button>

      {/* ── Locate me button ── */}
      <button
        type="button"
        onClick={locateUser}
        disabled={locating}
        title="Show my location"
        className="absolute top-3 right-14 z-10 flex h-9 w-9 items-center justify-center rounded-lg border bg-background/90 shadow-sm backdrop-blur-sm transition-all hover:bg-background disabled:opacity-50"
      >
        <LocateFixed
          className={`h-4 w-4 ${userLocation ? 'text-purple-500' : 'text-muted-foreground'} ${locating ? 'animate-spin' : ''}`}
        />
      </button>

      {/* ── Last updated badge ── */}
      {latestLocation && (
        <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}
          </span>
        </div>
      )}
    </div>
  )
}
