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
}

interface ShipmentMapProps {
  locations: LocationPoint[]
  originLat?: number | null
  originLng?: number | null
  originAddress?: string | null
  destinationLat?: number | null
  destinationLng?: number | null
  destinationAddress?: string | null
  height?: string
}

export function ShipmentMap(props: ShipmentMapProps) {
  return (
    <GoogleMapsProvider>
      <TrackingMap {...props} />
    </GoogleMapsProvider>
  )
}
