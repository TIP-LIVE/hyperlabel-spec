'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { MapPin, Radio, ChevronDown } from 'lucide-react'
import { countryCodeToFlag } from '@/lib/utils/country-flag'
import { formatDateRange } from '@/lib/utils/format-date-range'
import { cn } from '@/lib/utils'
import {
  formatLocationName,
  thinToTimeWindow,
  isNearby,
  groupConsecutiveByCity,
} from '@/lib/utils/location-display'

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
  eventType?: string | null
}

interface ShipmentTimelineProps {
  locations: LocationEvent[]
}

/**
 * Aggregate events within an expanded city group by geocodedArea (or proximity).
 * Unlike consecutive grouping, this merges ALL events for the same area into one
 * sub-group — eliminating the noisy A→B→A→B pattern caused by cell tower jitter.
 * Groups are ordered by first appearance (newest first, matching parent sort).
 */
function groupByArea(events: LocationEvent[]): LocationEvent[][] {
  if (events.length === 0) return []

  const groups: { key: string; events: LocationEvent[] }[] = []

  for (const event of events) {
    const areaKey = event.geocodedArea ?? null
    let matched = false

    for (const group of groups) {
      if (areaKey && group.key === areaKey) {
        group.events.push(event)
        matched = true
        break
      }
      if (!areaKey && isNearby(event, group.events[0])) {
        group.events.push(event)
        matched = true
        break
      }
    }

    if (!matched) {
      groups.push({
        key: areaKey || `${event.latitude.toFixed(3)},${event.longitude.toFixed(3)}`,
        events: [event],
      })
    }
  }

  return groups.map((g) => g.events)
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

  const thinnedLocations = useMemo(() => thinToTimeWindow(locations), [locations])
  const groups = useMemo(() => groupConsecutiveByCity(thinnedLocations), [thinnedLocations])

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

          // Grouped events — show summary with expand/collapse.
          // A date range (oldest → newest) is safe here because
          // groupConsecutiveByCity guarantees adjacent groups never overlap in
          // time, so reading top-to-bottom stays monotonically decreasing.
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
                    {first.id === last.id
                      ? format(new Date(first.recordedAt), 'PPp')
                      : formatDateRange(new Date(last.recordedAt), new Date(first.recordedAt))}
                  </p>
                </div>
              </button>

              {/* Expanded individual events — sub-grouped by area to reduce cell tower noise */}
              {isExpanded && (
                <div className="mt-2 space-y-2 sm:space-y-4 border-l-2 border-dashed border-muted-foreground/20 ml-[11px] sm:ml-[15px] pl-6 sm:pl-8">
                  {groupByArea(group.events).map((subGroup) => {
                    if (subGroup.length === 1) {
                      return (
                        <div key={subGroup[0].id} className="min-h-[36px] sm:min-h-[44px]">
                          {renderLocationRow(subGroup[0], false, true)}
                        </div>
                      )
                    }
                    // Multiple events in the same area — show one row with count.
                    // groupByArea merges A→B→A jitter into one sub-group, so a
                    // sub-group's date range overlaps its siblings (Kingston Vale
                    // events span the whole shipment, Putney Vale's range sits
                    // inside them, etc.). Showing only the newest timestamp keeps
                    // the expanded view monotonically decreasing top-to-bottom;
                    // the x{count} badge conveys that there were multiple visits.
                    const newest = subGroup[0]
                    return (
                      <div key={newest.id} className="min-h-[36px] sm:min-h-[44px]">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <span className="text-sm font-medium truncate">
                              {newest.geocodedCountryCode && (
                                <span className="mr-1">{countryCodeToFlag(newest.geocodedCountryCode)}</span>
                              )}
                              {detailLocationDisplayName(newest)}
                            </span>
                            <span className="shrink-0 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              x{subGroup.length}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(newest.recordedAt), 'PPp')}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
