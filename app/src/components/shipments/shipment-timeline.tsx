'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { MapPin, Radio, ChevronDown, Clock, Battery } from 'lucide-react'
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

/** Key for grouping: rounded to 3 decimal places (~111 m), matching geocode cache */
function placeKey(lat: number, lng: number): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`
}

interface LocationGroup {
  id: string // stable key for React
  placeKey: string
  locations: LocationEvent[]
  /** Representative location for geocoding (first/newest in group) */
  representative: LocationEvent
  /** Newest event timestamp */
  newestAt: Date
  /** Oldest event timestamp */
  oldestAt: Date
  /** Latest battery reading in the group */
  latestBattery: number | null
}

function groupConsecutiveLocations(locations: LocationEvent[]): LocationGroup[] {
  if (locations.length === 0) return []

  const groups: LocationGroup[] = []
  let current: LocationEvent[] = [locations[0]]
  let currentKey = placeKey(locations[0].latitude, locations[0].longitude)

  for (let i = 1; i < locations.length; i++) {
    const loc = locations[i]
    const key = placeKey(loc.latitude, loc.longitude)

    if (key === currentKey) {
      current.push(loc)
    } else {
      groups.push(buildGroup(current, currentKey))
      current = [loc]
      currentKey = key
    }
  }

  // Push last group
  groups.push(buildGroup(current, currentKey))
  return groups
}

function buildGroup(locations: LocationEvent[], key: string): LocationGroup {
  // locations are sorted newest-first
  const newestAt = locations[0].recordedAt
  const oldestAt = locations[locations.length - 1].recordedAt

  // Find latest non-null battery reading
  let latestBattery: number | null = null
  for (const loc of locations) {
    if (loc.batteryPct !== null) {
      latestBattery = loc.batteryPct
      break
    }
  }

  return {
    id: locations[0].id, // use newest event's id as group key
    placeKey: key,
    locations,
    representative: locations[0],
    newestAt,
    oldestAt,
    latestBattery,
  }
}

export function ShipmentTimeline({ locations }: ShipmentTimelineProps) {
  const groups = useMemo(() => groupConsecutiveLocations(locations), [locations])

  // Geocode one representative per group
  const geoLocations = useMemo(
    () =>
      groups.map((g) => ({
        id: g.id,
        latitude: g.representative.latitude,
        longitude: g.representative.longitude,
      })),
    [groups]
  )
  const locationNames = useReverseGeocode(geoLocations, 20)

  // First (newest) group starts expanded
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (groups.length > 0) initial.add(groups[0].id)
    return initial
  })

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 h-full w-px bg-border" />

      {/* Groups */}
      <div className="space-y-1">
        {groups.map((group, groupIdx) => {
          const isExpanded = expanded.has(group.id)
          const isSingle = group.locations.length === 1
          const geo = locationNames[group.id]
          const placeName =
            geo?.name ||
            `${group.representative.latitude.toFixed(4)}, ${group.representative.longitude.toFixed(4)}`
          const flag = geo?.countryCode ? countryCodeToFlag(geo.countryCode) : ''

          const isSameDay =
            format(new Date(group.newestAt), 'yyyy-MM-dd') ===
            format(new Date(group.oldestAt), 'yyyy-MM-dd')

          // Time display for the group header
          let timeDisplay: string
          if (isSingle) {
            timeDisplay = format(new Date(group.newestAt), 'PPp')
          } else if (isSameDay) {
            timeDisplay = `${format(new Date(group.oldestAt), 'p')} — ${format(new Date(group.newestAt), 'PPp')}`
          } else {
            timeDisplay = `${format(new Date(group.oldestAt), 'PP p')} — ${format(new Date(group.newestAt), 'PP p')}`
          }

          return (
            <div key={group.id}>
              {/* Group header row */}
              <button
                type="button"
                onClick={() => !isSingle && toggle(group.id)}
                className={cn(
                  'relative flex w-full items-start gap-3 rounded-lg py-3 pl-10 pr-3 text-left transition-colors',
                  !isSingle && 'hover:bg-muted/50 cursor-pointer',
                  isSingle && 'cursor-default'
                )}
              >
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute left-2 top-4 h-4 w-4 rounded-full border-2',
                    groupIdx === 0
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30 bg-background'
                  )}
                />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                      {flag && <span className="mr-1">{flag}</span>}
                      {placeName}
                    </span>
                    {!isSingle && (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {group.locations.length}x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeDisplay}
                    </span>
                    {group.latestBattery !== null && (
                      <span className="flex items-center gap-1">
                        <Battery className="h-3 w-3" />
                        {group.latestBattery}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Expand chevron */}
                {!isSingle && (
                  <ChevronDown
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                      isExpanded && 'rotate-180'
                    )}
                  />
                )}
              </button>

              {/* Expanded individual events */}
              {!isSingle && (
                <div
                  className={cn(
                    'grid transition-all duration-200 ease-in-out',
                    isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-0 pb-2 pl-14 pr-3">
                      {group.locations.map((loc) => (
                        <div
                          key={loc.id}
                          className="flex items-center gap-3 rounded py-1.5 text-xs text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                          <span>{format(new Date(loc.recordedAt), 'PPp')}</span>
                          {loc.accuracyM && <span>±{loc.accuracyM}m</span>}
                          {loc.batteryPct !== null && <span>{loc.batteryPct}%</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
