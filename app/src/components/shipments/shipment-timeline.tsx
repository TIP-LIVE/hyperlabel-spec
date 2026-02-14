'use client'

import { format } from 'date-fns'
import { MapPin, Radio } from 'lucide-react'
import { useReverseGeocode } from '@/hooks/use-reverse-geocode'
import { countryCodeToFlag } from '@/lib/utils/country-flag'

interface LocationEvent {
  id: string
  latitude: number
  longitude: number
  accuracyM: number | null
  batteryPct: number | null
  recordedAt: Date
  isOfflineSync: boolean
}

interface ShipmentTimelineProps {
  locations: LocationEvent[]
}

export function ShipmentTimeline({ locations }: ShipmentTimelineProps) {
  const locationNames = useReverseGeocode(locations)

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Radio className="h-10 w-10 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">No location events yet</p>
        <p className="text-xs text-muted-foreground">
          Location data will appear once the label starts transmitting
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 h-full w-px bg-border" />

      {/* Events */}
      <div className="space-y-6">
        {locations.map((location, index) => (
          <div key={location.id} className="relative flex gap-4 pl-10">
            {/* Timeline dot */}
            <div
              className={`absolute left-2 top-1 h-4 w-4 rounded-full border-2 ${
                index === 0
                  ? 'border-primary bg-primary'
                  : 'border-muted-foreground/30 bg-background'
              }`}
            />

            {/* Content */}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {locationNames[location.id]?.countryCode && (
                    <span className="mr-1">{countryCodeToFlag(locationNames[location.id].countryCode)}</span>
                  )}
                  {locationNames[location.id]?.name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                </span>
                {location.isOfflineSync && (
                  <span className="rounded bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-800 dark:text-yellow-200">
                    Offline sync
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(location.recordedAt), 'PPp')}
                {location.accuracyM && ` · ±${location.accuracyM}m`}
                {location.batteryPct !== null && ` · ${location.batteryPct}% battery`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
