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

interface PublicTrackingMapProps {
  locations: LocationPoint[]
  destinationLat?: number | null
  destinationLng?: number | null
  destinationAddress?: string | null
  height?: string
}

export function PublicTrackingMap(props: PublicTrackingMapProps) {
  return (
    <GoogleMapsProvider>
      <TrackingMap {...props} />
    </GoogleMapsProvider>
  )
}
