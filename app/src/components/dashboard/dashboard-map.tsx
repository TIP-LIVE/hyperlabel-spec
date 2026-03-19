'use client'

import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api'
import { useState, useCallback, useMemo, useRef } from 'react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { GoogleMapsProvider } from '@/components/maps/google-maps-provider'
import { formatDistanceToNow } from 'date-fns'

export interface DashboardShipmentMarker {
  id: string
  name: string
  latitude: number
  longitude: number
  locationName: string | null
  lastUpdate: string | null // ISO string
  batteryPct: number | null
}

interface DashboardMapProps {
  shipments: DashboardShipmentMarker[]
}

const mapContainerStyle = { width: '100%', height: '100%' }

const defaultCenter = { lat: 51.5074, lng: -0.1278 }

const lightStyles: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
]

const darkStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a9a' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#3a3a4e' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#b0b0c0' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a5e' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6a6a7a' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1525' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5568' }] },
]

function DashboardMapInner({ shipments }: DashboardMapProps) {
  const { resolvedTheme } = useTheme()
  const router = useRouter()
  const isDark = resolvedTheme === 'dark'
  const mapRef = useRef<google.maps.Map | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map
      if (shipments.length === 0) return
      const bounds = new google.maps.LatLngBounds()
      shipments.forEach((s) => bounds.extend({ lat: s.latitude, lng: s.longitude }))
      map.fitBounds(bounds, 50)
      // Don't zoom in too far for a single marker
      if (shipments.length === 1) {
        const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
          if ((map.getZoom() ?? 15) > 12) map.setZoom(12)
          google.maps.event.removeListener(listener)
        })
      }
    },
    [shipments],
  )

  const options = useMemo(
    (): google.maps.MapOptions => ({
      disableDefaultUI: true,
      zoomControl: true,
      styles: isDark ? darkStyles : lightStyles,
      backgroundColor: isDark ? '#1a1a2e' : '#f0f0f0',
    }),
    [isDark],
  )

  const selected = shipments.find((s) => s.id === selectedId)

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={shipments.length === 0 ? defaultCenter : undefined}
      zoom={shipments.length === 0 ? 4 : undefined}
      onLoad={onLoad}
      options={options}
    >
      {shipments.map((s) => (
        <Marker
          key={s.id}
          position={{ lat: s.latitude, lng: s.longitude }}
          onClick={() => setSelectedId(s.id)}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
          }}
        />
      ))}
      {selected && (
        <InfoWindow
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => setSelectedId(null)}
        >
          <div
            className="cursor-pointer p-1"
            onClick={() => router.push(`/shipments/${selected.id}`)}
          >
            <p className="font-medium text-sm text-gray-900">{selected.name}</p>
            {selected.locationName && (
              <p className="text-xs text-gray-600">{selected.locationName}</p>
            )}
            {selected.lastUpdate && (
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(selected.lastUpdate), { addSuffix: true })}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  )
}

export function DashboardMap({ shipments }: DashboardMapProps) {
  if (shipments.length === 0) return null

  return (
    <div className="h-[300px] w-full overflow-hidden rounded-lg border">
      <GoogleMapsProvider>
        <DashboardMapInner shipments={shipments} />
      </GoogleMapsProvider>
    </div>
  )
}
