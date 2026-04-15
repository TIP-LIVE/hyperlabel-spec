'use client'

import { GoogleMapsProvider } from './google-maps-provider'
import { TrackingMap } from './tracking-map'

interface LocationPoint {
  id: string
  latitude: number
  longitude: number
  recordedAt: Date
  batteryPct: number | null
  accuracyM: number | null
  geocodedCity?: string | null
  geocodedArea?: string | null
  geocodedCountry?: string | null
  geocodedCountryCode?: string | null
  geocodedAt?: Date | string | null
}

interface ShipmentMapProps {
  locations: LocationPoint[]
  originLat?: number | null
  originLng?: number | null
  originAddress?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  destinationAddress?: string | null
  currentLocationLabel?: string | null
  height?: string
  lastSeenAt?: Date | string | null
}

export function ShipmentMap(props: ShipmentMapProps) {
  return (
    <GoogleMapsProvider>
      <TrackingMap {...props} />
    </GoogleMapsProvider>
  )
}
