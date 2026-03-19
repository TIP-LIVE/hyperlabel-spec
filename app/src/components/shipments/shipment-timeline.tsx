'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { MapPin, Radio, ChevronDown } from 'lucide-react'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { formatDateRange } from '@/lib/utils/format-date-range'
import { cn } from '@/lib/utils'
import { formatLocationName } from '@/lib/utils/location-display'

interface LocationEvent {
  id: string
  latitude: number
  longitude: number
  accuracyM: number | null
  batteryPct: number | null
  recordedAt: Date
  isOfflineSync: boolean
  geocodedCity: string | null
  geocodedArea: string | null
  geocodedCountry: string | null
  geocodedCountryCode: string | null
}

interface ShipmentTimelineProps {
  locations: LocationEvent[]
}

interface LocationGroup {
  events: LocationEvent[]
  /** Representative event (first in the group = most recent, since locations are sorted newest-first) */
  representative: LocationEvent
}

/** Check if two coordinates are within ~500m of each other (fallback for un-geocoded records) */
function isNearby(a: LocationEvent, b: LocationEvent): boolean {
  const dlat = Math.abs(a.latitude - b.latitude)
  const dlng = Math.abs(a.longitude - b.longitude)
  // ~0.005 degrees ≈ 500m at mid-latitudes
  return dlat < 0.005 && dlng < 0.005
}

/** Group consecutive locations by geocoded city name, falling back to spatial proximity */
function groupConsecutiveLocations(locations: LocationEvent[]): LocationGroup[] {
  if (locations.length === 0) return []

  const groups: LocationGroup[] = []
  let current: LocationGroup = { events: [locations[0]], representative: locations[0] }

  for (let i = 1; i < locations.length; i++) {
    const prev = current.representative
    const curr = locations[i]

    // Group by geocoded city when available, fall back to spatial for un-geocoded records
    const sameGroup =
      prev.geocodedCity && curr.geocodedCity
        ? prev.geocodedCity === curr.geocodedCity
        : isNearby(prev, curr)

    if (sameGroup) {
      current.events.push(curr)
    } else {
      groups.push(current)
      current = { events: [curr], representative: curr }
    }
  }
  groups.push(current)
  return groups
}

function locationDisplayName(location: LocationEvent): string {
  return formatLocationName(location) ?? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
}

/** More precise display name for expanded detail rows (suburb/area level) */
function detailLocationDisplayName(location: LocationEvent): string {
  if (location.geocodedArea && location.geocodedCity && location.geocodedCountry) {
    return location.geocodedArea === location.geocodedCity
      ? `${location.geocodedCity}, ${location.geocodedCountry}`
      : `${location.geocodedArea}, ${location.geocodedCity}`
  }
  if (location.geocodedArea && location.geocodedCountry) {
    return `${location.geocodedArea}, ${location.geocodedCountry}`
  }
  return locationDisplayName(location)
}

export function ShipmentTimeline({ locations }: ShipmentTimelineProps) {
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
        <Radio className="h-10 w-10 text-muted-foreground/50 animate-pulse" />
        <p className="mt-3 text-sm text-muted-foreground">Acquiring signal</p>
        <p className="text-xs text-muted-foreground">
          The label is connecting to the cellular network. First location typically appears within a few minutes.
        </p>
      </div>
    )
  }

  /** Render a single location row */
  function renderLocationRow(location: LocationEvent, isLatest: boolean, useDetailName = false) {
    return (
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
          <span className="text-sm font-medium truncate">
            {location.geocodedCountryCode && (
              <span className="mr-1">{countryCodeToFlag(location.geocodedCountryCode)}</span>
            )}
            {useDetailName ? detailLocationDisplayName(location) : locationDisplayName(location)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(location.recordedAt), 'PPp')}
          {location.batteryPct !== null && ` · ${location.batteryPct}% battery`}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 sm:left-4 top-0 bottom-8 w-px bg-border" />

      {/* Events */}
      <div className="space-y-3 sm:space-y-6">
        {groups.map((group, groupIndex) => {
          const isLatestGroup = groupIndex === 0
          const isLastGroup = groupIndex === groups.length - 1
          const isExpanded = expandedGroups.has(groupIndex)
          const isSingleEvent = group.events.length === 1

          if (isSingleEvent) {
            // Single event — render normally
            const location = group.events[0]
            return (
              <div key={location.id} className="relative flex gap-4 pl-8 sm:pl-10 min-h-[44px] sm:min-h-[56px]">
                <div
                  className={cn(
                    'absolute rounded-full border-2',
                    isLastGroup
                      ? 'left-[7px] sm:left-[11px] top-2 h-2.5 w-2.5 border-muted-foreground/20 bg-background'
                      : 'left-1 sm:left-2 top-1 h-4 w-4',
                    !isLastGroup && (isLatestGroup
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background')
                  )}
                />
                {renderLocationRow(location, isLatestGroup)}
              </div>
            )
          }

          // Grouped events — show summary with expand/collapse
          const first = group.events[0] // newest
          const last = group.events[group.events.length - 1] // oldest

          return (
            <div key={first.id}>
              {/* Group summary row */}
              <button
                type="button"
                onClick={() => toggleGroup(groupIndex)}
                className="relative flex w-full items-start gap-4 min-h-[44px] sm:min-h-[56px] text-left hover:bg-accent/30 rounded-lg transition-colors -ml-1 pl-9 sm:pl-11 pr-2 py-1"
              >
                <div
                  className={cn(
                    'absolute rounded-full border-2',
                    isLastGroup
                      ? 'left-[11px] sm:left-[15px] top-3 h-2.5 w-2.5 border-muted-foreground/20 bg-background'
                      : 'left-2 sm:left-3 top-2 h-4 w-4',
                    !isLastGroup && (isLatestGroup
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background')
                  )}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {first.geocodedCountryCode && (
                        <span className="mr-1">{countryCodeToFlag(first.geocodedCountryCode)}</span>
                      )}
                      {locationDisplayName(first)}
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
                    {formatDateRange(new Date(last.recordedAt), new Date(first.recordedAt))}
                  </p>
                </div>
              </button>

              {/* Expanded individual events */}
              {isExpanded && (
                <div className="mt-2 space-y-2 sm:space-y-4 border-l-2 border-dashed border-muted-foreground/20 ml-[11px] sm:ml-[15px] pl-6 sm:pl-8">
                  {group.events.map((location) => (
                    <div key={location.id} className="min-h-[36px] sm:min-h-[44px]">
                      {renderLocationRow(location, false, true)}
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
