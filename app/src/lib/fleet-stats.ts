import { db, VALID_LOCATION } from '@/lib/db'

export interface FleetStats {
  counts: {
    active: number
    inventory: number
    sold: number
    depleted: number
    lowBattery: number
    noSignal: number
  }
  reporting: {
    last24h: number
    last7d: number
    total: number
    avgReportsPerDayPerDevice: number
  }
  battery: {
    excellent: number // 80-100%
    good: number // 50-79%
    fair: number // 20-49%
    low: number // 1-19%
    dead: number // 0%
    unknown: number // null
  }
  signal: {
    gpsCount: number
    cellTowerCount: number
    offlineSyncCount: number
    offlineSyncPct: number
  }
  geography: Array<{
    country: string
    countryCode: string | null
    count: number
  }>
}

/** Check if a label has no signal (>24h since last ping) */
function isNoSignal(
  locations: { recordedAt: Date }[],
  referenceTime: number,
): boolean {
  if (locations.length === 0) return true
  const lastPing = new Date(locations[0].recordedAt)
  const hoursSince = (referenceTime - lastPing.getTime()) / (1000 * 60 * 60)
  return hoursSince > 24
}

export async function getFleetStats(): Promise<FleetStats> {
  const now = new Date()
  const referenceTime = now.getTime()
  const twentyFourHoursAgo = new Date(referenceTime - 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(referenceTime - 7 * 24 * 60 * 60 * 1000)

  const [
    active,
    inventory,
    sold,
    depleted,
    lowBattery,
    // Battery distribution
    batteryExcellent,
    batteryGood,
    batteryFair,
    batteryLow,
    batteryDead,
    batteryUnknown,
    // Reporting
    totalEvents,
    last24h,
    last7d,
    // Signal sources
    gpsCount,
    cellTowerCount,
    offlineSyncCount,
    // Geographic distribution
    geoGroups,
    // Active labels with latest location (for no-signal computation)
    activeLabelsWithLocation,
  ] = await Promise.all([
    // Status counts
    db.label.count({ where: { status: 'ACTIVE' } }),
    db.label.count({ where: { status: 'INVENTORY' } }),
    db.label.count({ where: { status: 'SOLD' } }),
    db.label.count({ where: { status: 'DEPLETED' } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: { lt: 20, gt: 0 } } }),
    // Battery distribution (active labels only)
    db.label.count({ where: { status: 'ACTIVE', batteryPct: { gte: 80 } } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: { gte: 50, lt: 80 } } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: { gte: 20, lt: 50 } } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: { gt: 0, lt: 20 } } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: 0 } }),
    db.label.count({ where: { status: 'ACTIVE', batteryPct: null } }),
    // Reporting frequency
    db.locationEvent.count({ where: { ...VALID_LOCATION } }),
    db.locationEvent.count({ where: { recordedAt: { gte: twentyFourHoursAgo }, ...VALID_LOCATION } }),
    db.locationEvent.count({ where: { recordedAt: { gte: sevenDaysAgo }, ...VALID_LOCATION } }),
    // Signal sources (all time)
    db.locationEvent.count({ where: { source: 'GPS', ...VALID_LOCATION } }),
    db.locationEvent.count({ where: { source: 'CELL_TOWER', ...VALID_LOCATION } }),
    db.locationEvent.count({ where: { isOfflineSync: true, ...VALID_LOCATION } }),
    // Geographic distribution (top 10 countries)
    db.locationEvent.groupBy({
      by: ['geocodedCountry', 'geocodedCountryCode'],
      where: { geocodedCountry: { not: null }, ...VALID_LOCATION },
      _count: { _all: true },
      orderBy: { _count: { geocodedCountry: 'desc' } },
      take: 10,
    }),
    // Active labels with latest location for no-signal check
    db.label.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        locations: {
          where: { ...VALID_LOCATION },
          orderBy: { recordedAt: 'desc' as const },
          take: 1,
          select: { recordedAt: true },
        },
      },
    }),
  ])

  const noSignalCount = activeLabelsWithLocation.filter((l) =>
    isNoSignal(l.locations, referenceTime),
  ).length

  // Average reports per day per device over last 7 days
  const avgReportsPerDayPerDevice =
    active > 0 ? Math.round((last7d / 7 / active) * 10) / 10 : 0

  const totalSignal = gpsCount + cellTowerCount
  const offlineSyncPct =
    totalEvents > 0 ? Math.round((offlineSyncCount / totalEvents) * 1000) / 10 : 0

  return {
    counts: { active, inventory, sold, depleted, lowBattery, noSignal: noSignalCount },
    reporting: { last24h, last7d, total: totalEvents, avgReportsPerDayPerDevice },
    battery: {
      excellent: batteryExcellent,
      good: batteryGood,
      fair: batteryFair,
      low: batteryLow,
      dead: batteryDead,
      unknown: batteryUnknown,
    },
    signal: {
      gpsCount,
      cellTowerCount,
      offlineSyncCount,
      offlineSyncPct,
    },
    geography: geoGroups.map((g) => ({
      country: g.geocodedCountry!,
      countryCode: g.geocodedCountryCode,
      count: g._count._all,
    })),
  }
}

// ============================================
// Reporting History (for charts)
// ============================================

export interface ReportingDay {
  date: string // YYYY-MM-DD
  deviceCount: number
  onomondoCount: number
}

/**
 * Get daily event counts by source for the last 14 days.
 */
export async function getReportingHistory(): Promise<ReportingDay[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Prisma groupBy doesn't support date_trunc, so we fetch timestamps + source
  // and bucket by day in JS.
  const rawEvents = await db.locationEvent.findMany({
    where: { recordedAt: { gte: fourteenDaysAgo }, ...VALID_LOCATION },
    select: { recordedAt: true, source: true },
    orderBy: { recordedAt: 'asc' },
  })

  // Bucket by day
  const dayMap = new Map<string, { deviceCount: number; onomondoCount: number }>()

  // Pre-fill all 14 days so chart has no gaps
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dayMap.set(key, { deviceCount: 0, onomondoCount: 0 })
  }

  for (const event of rawEvents) {
    const key = new Date(event.recordedAt).toISOString().slice(0, 10)
    const bucket = dayMap.get(key)
    if (bucket) {
      if (event.source === 'CELL_TOWER') {
        bucket.onomondoCount++
      } else {
        bucket.deviceCount++
      }
    }
  }

  return Array.from(dayMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }))
}
