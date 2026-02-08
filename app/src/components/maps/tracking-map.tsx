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
  destinationLat?: number | null
  destinationLng?: number | null
  destinationAddress?: string | null
  originAddress?: string | null
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

// Light map styles — clean, minimal
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

// Dark map styles — matches the app's dark theme
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

export function TrackingMap({
  locations,
  destinationLat,
  destinationLng,
  destinationAddress,
  originAddress,
  height = '400px',
}: TrackingMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null)
  const [mapRef, setMapRef] = useState<google.maps.Map | null>(null)
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === 'dark'

  // Update map styles when theme changes
  useEffect(() => {
    if (mapRef) {
      mapRef.setOptions({
        styles: isDark ? darkStyles : lightStyles,
      })
    }
  }, [isDark, mapRef])

  // Get the latest location (first in array, since ordered desc)
  const latestLocation = locations[0]

  // Center on latest location or destination or default
  const center = useMemo(() => {
    if (latestLocation) {
      return { lat: latestLocation.latitude, lng: latestLocation.longitude }
    }
    if (destinationLat && destinationLng) {
      return { lat: destinationLat, lng: destinationLng }
    }
    return defaultCenter
  }, [latestLocation, destinationLat, destinationLng])

  // Path for polyline (reverse order so oldest is first)
  const path = useMemo(
    () =>
      [...locations].reverse().map((loc) => ({
        lat: loc.latitude,
        lng: loc.longitude,
      })),
    [locations]
  )

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

      // Fit bounds to show all markers
      if (locations.length > 0) {
        const bounds = new google.maps.LatLngBounds()
        locations.forEach((loc) => {
          bounds.extend({ lat: loc.latitude, lng: loc.longitude })
        })
        if (destinationLat && destinationLng) {
          bounds.extend({ lat: destinationLat, lng: destinationLng })
        }
        map.fitBounds(bounds, 50)
      }
    },
    [locations, destinationLat, destinationLng]
  )

  const onUnmount = useCallback(() => {
    setMapRef(null)
  }, [])

  if (locations.length === 0 && !destinationLat) {
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
    <div style={{ height }} className="relative overflow-hidden rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Route polyline — dashed line connecting all points */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0,
              icons: [
                {
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    scale: 3,
                  },
                  offset: '0',
                  repeat: '16px',
                },
              ],
            }}
          />
        )}

        {/* Solid route line underneath for better visibility */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.3,
              strokeWeight: 3,
            }}
          />
        )}

        {/* Historical location markers (smaller, faded) */}
        {locations.slice(1).map((location) => (
          <Marker
            key={location.id}
            position={{ lat: location.latitude, lng: location.longitude }}
            onClick={() => setSelectedLocation(location)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 5,
              fillColor: isDark ? '#64748b' : '#94a3b8',
              fillOpacity: 0.6,
              strokeColor: isDark ? '#1e293b' : '#ffffff',
              strokeWeight: 1.5,
            }}
          />
        ))}

        {/* Current location — pulsing outer ring via OverlayView */}
        {latestLocation && (
          <OverlayView
            position={{ lat: latestLocation.latitude, lng: latestLocation.longitude }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="relative flex items-center justify-center">
              {/* Pulsing ring */}
              <div className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full bg-blue-500/30" />
              {/* Solid outer ring */}
              <div className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-blue-500 shadow-lg dark:border-gray-800" />
              {/* Inner dot */}
              <div className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
            </div>
          </OverlayView>
        )}

        {/* Invisible marker on top for click handling */}
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

        {/* Destination marker */}
        {destinationLat && destinationLng && (
          <Marker
            position={{ lat: destinationLat, lng: destinationLng }}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: isDark ? '#1e293b' : '#ffffff',
              strokeWeight: 2,
              rotation: 180,
            }}
            title={destinationAddress || 'Destination'}
          />
        )}

        {/* Info window for selected location */}
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

      {/* Map legend */}
      <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1.5 rounded-lg border bg-background/90 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full border-2 border-white bg-blue-500 shadow-sm" />
          <span className="text-muted-foreground">Current location</span>
        </div>
        {locations.length > 1 && (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-slate-400/60" />
            <span className="text-muted-foreground">Previous locations</span>
          </div>
        )}
        {destinationLat && destinationLng && (
          <div className="flex items-center gap-2">
            <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-green-500" />
            <span className="text-muted-foreground">
              {destinationAddress
                ? destinationAddress.split(',').slice(0, 2).join(',')
                : 'Destination'}
            </span>
          </div>
        )}
      </div>

      {/* Last updated badge */}
      {latestLocation && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full border bg-background/90 px-2.5 py-1 text-[11px] shadow-sm backdrop-blur-sm">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground">
            {formatDistanceToNow(new Date(latestLocation.recordedAt), { addSuffix: true })}
          </span>
        </div>
      )}
    </div>
  )
}
