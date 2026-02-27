'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { MapPin, Radio, ChevronDown } from 'lucide-react'
import { useReverseGeocode } from '@/hooks/use-reverse-geocode'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { cn } from '@/lib/utils'

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

interface LocationGroup {
  events: LocationEvent[]
  /** Representative event (first in the group = most recent, since locations are sorted newest-first) */
  representative: LocationEvent
}

/** Check if two coordinates are within ~500m of each other */
function isNearby(a: LocationEvent, b: LocationEvent): boolean {
  const dlat = Math.abs(a.latitude - b.latitude)
  const dlng = Math.abs(a.longitude - b.longitude)
  // ~0.005 degrees ≈ 500m at mid-latitudes
  return dlat < 0.005 && dlng < 0.005
}

/** Group consecutive locations that are within ~500m of each other */
function groupConsecutiveLocations(locations: LocationEvent[]): LocationGroup[] {
  if (locations.length === 0) return []

  const groups: LocationGroup[] = []
  let current: LocationGroup = { events: [locations[0]], representative: locations[0] }

  for (let i = 1; i < locations.length; i++) {
    if (isNearby(current.representative, locations[i])) {
      current.events.push(locations[i])
    } else {
      groups.push(current)
      current = { events: [locations[i]], representative: locations[i] }
    }
  }
  groups.push(current)
  return groups
}

export function ShipmentTimeline({ locations }: ShipmentTimelineProps) {
  const locationNames = useReverseGeocode(locations)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())

  const groups = useMemo(() => groupConsecutiveLocations(locations), [locations])

  const toggleGroup = (index: number) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

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

  /** Render a single location row */
  function renderLocationRow(location: LocationEvent, isLatest: boolean) {
    const geo = locationNames[location.id]
    return (
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">
            {geo?.countryCode && (
              <span className="mr-1">{countryCodeToFlag(geo.countryCode)}</span>
            )}
            {geo?.name || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(location.recordedAt), 'PPp')}
          {location.accuracyM && ` · ±${location.accuracyM}m`}
          {location.batteryPct !== null && ` · ${location.batteryPct}% battery`}
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
        {groups.map((group, groupIndex) => {
          const isLatestGroup = groupIndex === 0
          const isExpanded = expandedGroups.has(groupIndex)
          const isSingleEvent = group.events.length === 1

          if (isSingleEvent) {
            // Single event — render normally
            const location = group.events[0]
            return (
              <div key={location.id} className="relative flex gap-4 pl-10 min-h-[56px]">
                <div
                  className={`absolute left-2 top-1 h-4 w-4 rounded-full border-2 ${
                    isLatestGroup
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background'
                  }`}
                />
                {renderLocationRow(location, isLatestGroup)}
              </div>
            )
          }

          // Grouped events — show summary with expand/collapse
          const first = group.events[0] // newest
          const last = group.events[group.events.length - 1] // oldest
          const geo = locationNames[first.id]

          return (
            <div key={first.id}>
              {/* Group summary row */}
              <button
                type="button"
                onClick={() => toggleGroup(groupIndex)}
                className="relative flex w-full items-start gap-4 pl-10 min-h-[56px] text-left hover:bg-accent/30 rounded-lg transition-colors -ml-1 pl-11 pr-2 py-1"
              >
                <div
                  className={`absolute left-3 top-2 h-4 w-4 rounded-full border-2 ${
                    isLatestGroup
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background'
                  }`}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {geo?.countryCode && (
                        <span className="mr-1">{countryCodeToFlag(geo.countryCode)}</span>
                      )}
                      {geo?.name || `${first.latitude.toFixed(4)}, ${first.longitude.toFixed(4)}`}
                    </span>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      x{group.events.length}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(first.recordedAt), 'PPp')}
                    {' — '}
                    {format(new Date(last.recordedAt), 'PPp')}
                  </p>
                </div>
              </button>

              {/* Expanded individual events */}
              {isExpanded && (
                <div className="mt-2 space-y-4 border-l-2 border-dashed border-muted-foreground/20 ml-[15px] pl-8">
                  {group.events.map((location) => (
                    <div key={location.id} className="min-h-[44px]">
                      {renderLocationRow(location, false)}
                    </div>
                  ))}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
