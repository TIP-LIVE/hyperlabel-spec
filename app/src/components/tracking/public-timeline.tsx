'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { MapPin, Radio, ChevronDown } from 'lucide-react'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { formatDateRange } from '@/lib/utils/format-date-range'
import { cn } from '@/lib/utils'

interface LocationEvent {
  id: string
  latitude: number
  longitude: number
  accuracyM: number | null
  batteryPct: number | null
  recordedAt: Date
  isOfflineSync: boolean
  geocodedCity: string | null
  geocodedCountry: string | null
  geocodedCountryCode: string | null
}

interface PublicTimelineProps {
  locations: LocationEvent[]
}

interface LocationGroup {
  events: LocationEvent[]
  representative: LocationEvent
}

/** Check if two coordinates are within ~500m of each other (fallback for un-geocoded records) */
function isNearby(a: LocationEvent, b: LocationEvent): boolean {
  const dlat = Math.abs(a.latitude - b.latitude)
  const dlng = Math.abs(a.longitude - b.longitude)
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
  if (location.geocodedCity && location.geocodedCountry) {
    return `${location.geocodedCity}, ${location.geocodedCountry}`
  }
  if (location.geocodedCity) return location.geocodedCity
  if (location.geocodedCountry) return location.geocodedCountry
  return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
}

export function PublicTimeline({ locations }: PublicTimelineProps) {
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
        <p className="mt-3 text-sm text-muted-foreground">Acquiring GPS signal</p>
        <p className="text-xs text-muted-foreground">
          The tracking label is connecting. This page updates automatically — first location usually appears within a few minutes.
        </p>
      </div>
    )
  }

  function renderLocationRow(location: LocationEvent) {
    return (
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm font-medium">
            {location.geocodedCountryCode && (
              <span className="mr-1">{countryCodeToFlag(location.geocodedCountryCode)}</span>
            )}
            {locationDisplayName(location)}
          </span>
          {location.isOfflineSync && (
            <span className="rounded bg-yellow-100 dark:bg-yellow-900/30 px-1.5 py-0.5 text-xs text-yellow-800 dark:text-yellow-200">
              Synced
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(location.recordedAt), 'PPp')}
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-3 sm:left-4 top-0 bottom-8 w-px bg-border" />

      {/* Events */}
      <div className="space-y-3 sm:space-y-4">
        {groups.map((group, groupIndex) => {
          const isLatestGroup = groupIndex === 0
          const isLastGroup = groupIndex === groups.length - 1
          const isExpanded = expandedGroups.has(groupIndex)
          const isSingleEvent = group.events.length === 1

          if (isSingleEvent) {
            const location = group.events[0]
            return (
              <div key={location.id} className="relative flex gap-4 pl-8 sm:pl-10">
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
                {renderLocationRow(location)}
              </div>
            )
          }

          const first = group.events[0]
          const last = group.events[group.events.length - 1]

          return (
            <div key={first.id}>
              <button
                type="button"
                onClick={() => toggleGroup(groupIndex)}
                className="relative flex w-full items-start gap-4 text-left hover:bg-accent/30 rounded-lg transition-colors -ml-1 pl-9 sm:pl-11 pr-2 py-1"
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

              {isExpanded && (
                <div className="mt-2 space-y-2 sm:space-y-3 border-l-2 border-dashed border-muted-foreground/20 ml-[11px] sm:ml-[15px] pl-6 sm:pl-8">
                  {group.events.map((location) => (
                    <div key={location.id} className="min-h-[36px] sm:min-h-[40px]">
                      {renderLocationRow(location)}
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
