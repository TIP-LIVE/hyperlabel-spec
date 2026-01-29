'use client'

import { GoogleMap, Marker, Polyline, InfoWindow } from '@react-google-maps/api'
import { useState, useCallback, useMemo } from 'react'
import { format } from 'date-fns'

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

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
}

export function TrackingMap({
  locations,
  destinationLat,
  destinationLng,
  destinationAddress,
  height = '400px',
}: TrackingMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationPoint | null>(null)
  const [, setMap] = useState<google.maps.Map | null>(null)

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

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map)

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
  }, [locations, destinationLat, destinationLng])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (locations.length === 0 && !destinationLat) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border-2 border-dashed bg-muted/50"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No location data available</p>
      </div>
    )
  }

  return (
    <div style={{ height }} className="overflow-hidden rounded-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      >
        {/* Route polyline */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: '#3b82f6',
              strokeOpacity: 0.8,
              strokeWeight: 3,
            }}
          />
        )}

        {/* Current location marker (latest) */}
        {latestLocation && (
          <Marker
            position={{ lat: latestLocation.latitude, lng: latestLocation.longitude }}
            onClick={() => setSelectedLocation(latestLocation)}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
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
              fillColor: '#94a3b8',
              fillOpacity: 0.6,
              strokeColor: '#ffffff',
              strokeWeight: 1,
            }}
          />
        ))}

        {/* Destination marker */}
        {destinationLat && destinationLng && (
          <Marker
            position={{ lat: destinationLat, lng: destinationLng }}
            icon={{
              path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
              scale: 6,
              fillColor: '#22c55e',
              fillOpacity: 1,
              strokeColor: '#ffffff',
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
          >
            <div className="p-1">
              <p className="font-medium">
                {format(new Date(selectedLocation.recordedAt), 'PPp')}
              </p>
              <p className="text-sm text-gray-600">
                {selectedLocation.latitude.toFixed(5)}, {selectedLocation.longitude.toFixed(5)}
              </p>
              {selectedLocation.batteryPct !== null && (
                <p className="text-sm text-gray-600">Battery: {selectedLocation.batteryPct}%</p>
              )}
              {selectedLocation.accuracyM && (
                <p className="text-sm text-gray-600">Accuracy: ±{selectedLocation.accuracyM}m</p>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  )
}
