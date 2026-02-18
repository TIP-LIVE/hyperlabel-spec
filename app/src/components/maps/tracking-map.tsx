'use client'

import { GoogleMap, Marker, Polyline, InfoWindow, OverlayView } from '@react-google-maps/api'
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { format, formatDistanceToNow } from 'date-fns'
import { MapPin } from 'lucide-react'

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

function MapLabel({
  text,
  color,
  position,
}: {
  text: string
  color: string
  position: google.maps.LatLngLiteral
}) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        className="pointer-events-none -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-lg"
        style={{
          backgroundColor: color,
          color: '#fff',
          marginTop: '-36px',
          border: '2px solid rgba(255,255,255,0.9)',
        }}
      >
        {text}
      </div>
    </OverlayView>
  )
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
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
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
  const hasOrigin = originLat != null && originLng != null
  const hasDestination = destinationLat != null && destinationLng != null

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

  // Build the full route path: origin -> location points -> (destination is shown separately)
  const path = useMemo(() => {
    const points: google.maps.LatLngLiteral[] = []

    if (hasOrigin) {
      points.push({ lat: originLat!, lng: originLng! })
    }

    const reversed = [...locations].reverse()
    reversed.forEach((loc) => {
      points.push({ lat: loc.latitude, lng: loc.longitude })
    })

    return points
  }, [locations, hasOrigin, originLat, originLng])

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
      styles: isDark ? darkStyles : lightStyles,
    }),
    [isDark]
  )

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMapRef(map)

      if (locations.length > 0 || hasOrigin || hasDestination) {
        const bounds = new google.maps.LatLngBounds()
        if (hasOrigin) {
          bounds.extend({ lat: originLat!, lng: originLng! })
        }
        locations.forEach((loc) => {
          bounds.extend({ lat: loc.latitude, lng: loc.longitude })
        })
        if (hasDestination) {
          bounds.extend({ lat: destinationLat!, lng: destinationLng! })
        }
        map.fitBounds(bounds, 60)
      }
    },
    [locations, hasOrigin, originLat, originLng, hasDestination, destinationLat, destinationLng]
  )

  const onUnmount = useCallback(() => {
    setMapRef(null)
  }, [])

  if (locations.length === 0 && !hasDestination && !hasOrigin) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-muted/50"
        style={{ height }}
      >
        <MapPin className="h-8 w-8 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">No location data available</p>
          <p className="mt-1 text-xs text-muted-foreground/70">
            Location updates will appear once the label starts transmitting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height }} className="relative overflow-hidden rounded-xl">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* ── Completed route: solid line from origin through all tracked points ── */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: isDark ? '#60a5fa' : '#3b82f6',
              strokeOpacity: 0.85,
              strokeWeight: 3,
              geodesic: true,
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

        {/* ── Origin marker ── */}
        {hasOrigin && (
          <>
            <OverlayView
              position={{ lat: originLat!, lng: originLng! }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: isDark ? '#34d399' : '#10b981',
                    border: '3px solid rgba(255,255,255,0.95)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    backgroundColor: '#fff',
                  }}
                />
              </div>
            </OverlayView>
            <MapLabel
              text={originAddress ? originAddress.split(',')[0] : 'Origin'}
              color={isDark ? '#059669' : '#047857'}
              position={{ lat: originLat!, lng: originLng! }}
            />
          </>
        )}

        {/* ── Historical location dots ── */}
        {locations.slice(1).map((location) => (
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
        {latestLocation && (
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
        {hasDestination && (
          <>
            <OverlayView
              position={{ lat: destinationLat!, lng: destinationLng! }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div className="relative flex items-center justify-center">
                {/* Flag-like pin */}
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderTop: `16px solid ${isDark ? '#f87171' : '#ef4444'}`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  }}
                />
                <div
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    backgroundColor: isDark ? '#f87171' : '#ef4444',
                    border: '2px solid rgba(255,255,255,0.95)',
                    marginTop: -10,
                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                  }}
                />
              </div>
            </OverlayView>
            <MapLabel
              text={destinationAddress ? destinationAddress.split(',')[0] : 'Destination'}
              color={isDark ? '#dc2626' : '#b91c1c'}
              position={{ lat: destinationLat!, lng: destinationLng! }}
            />
          </>
        )}

        {/* ── Info window for clicked location ── */}
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
                {selectedLocation.accuracyM && (
                  <span>📍 ±{selectedLocation.accuracyM}m</span>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* ── Map legend ── */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1 rounded-xl border bg-background/95 px-3 py-2 text-[11px] shadow-md backdrop-blur-sm">
        {hasOrigin && (
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            <span className="text-muted-foreground">Origin</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
          <span className="text-muted-foreground">Current</span>
        </div>
        {locations.length > 1 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-400/60" />
            <span className="text-muted-foreground">History</span>
          </div>
        )}
        {hasDestination && (
          <div className="flex items-center gap-2">
            <div className="h-0 w-0 border-l-[4px] border-r-[4px] border-t-[7px] border-l-transparent border-r-transparent border-t-red-500" />
            <span className="text-muted-foreground">Destination</span>
          </div>
        )}
      </div>

      {/* ── Last updated badge ── */}
      {latestLocation && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border bg-background/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}
          </span>
        </div>
      )}
    </div>
  )
}
