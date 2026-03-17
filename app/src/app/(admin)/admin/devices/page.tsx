import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { getFleetStats, getReportingHistory } from '@/lib/fleet-stats'
import { formatDistanceToNow } from 'date-fns'
import { AdminSearch } from '@/components/admin/admin-search'
import { FleetStatsGrid } from '@/components/admin/fleet-stats-grid'
import { BatteryDistribution } from '@/components/admin/battery-distribution'
import { SignalQualityCard } from '@/components/admin/signal-quality-card'
import { GeoDistributionTable } from '@/components/admin/geo-distribution-table'
import { SimStatusPanel } from '@/components/admin/sim-status-panel'
import { ReportingFrequencyChart } from '@/components/admin/charts/reporting-frequency-chart'
import { getOnomonodoSims } from '@/lib/onomondo'
import { MapPin, Satellite, Radio, ExternalLink, Activity } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Dashboard',
  description: 'Fleet overview and device health monitoring',
}

// Helper to check if label has no signal (>24h since last ping)
function checkNoSignal(
  locations: { recordedAt: Date }[],
  referenceTime: number
): boolean {
  if (locations.length === 0) return true
  const lastPing = new Date(locations[0].recordedAt)
  const hoursSinceLastPing = (referenceTime - lastPing.getTime()) / (1000 * 60 * 60)
  return hoursSinceLastPing > 24
}

interface PageProps {
  searchParams: Promise<{ q?: string; health?: string; page?: string }>
}

export default async function AdminDevicesPage({ searchParams }: PageProps) {
  const { q, health: healthFilter, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 25

  const where: Record<string, unknown> = { status: 'ACTIVE' }

  if (q) {
    where.OR = [
      { deviceId: { contains: q, mode: 'insensitive' } },
      { imei: { contains: q, mode: 'insensitive' } },
    ]
  }

  // Fetch fleet stats, reporting history, Onomondo SIMs, and device table data in parallel
  const [fleetStats, reportingHistory, onomondoSims, allActiveLabels, healthCounts] = await Promise.all([
    getFleetStats(),
    getReportingHistory(),
    getOnomonodoSims().catch(() => [] as Awaited<ReturnType<typeof getOnomonodoSims>>),
    db.label.findMany({
      where,
      include: {
        locations: {
          orderBy: { recordedAt: 'desc' as const },
          take: 1,
          select: {
            recordedAt: true,
            latitude: true,
            longitude: true,
            source: true,
            geocodedCity: true,
            geocodedCountry: true,
          },
        },
        shipments: {
          where: { status: 'IN_TRANSIT' },
          take: 1,
          select: { name: true, shareCode: true, type: true },
        },
      },
      orderBy: { activatedAt: 'desc' },
    }),
    Promise.all([
      db.label.count({ where: { status: 'ACTIVE' } }),
      db.label.count({ where: { status: 'ACTIVE', batteryPct: { gte: 20 } } }),
      db.label.count({ where: { status: 'ACTIVE', batteryPct: { lt: 20, gt: 0 } } }),
    ]),
  ])

  // Build ICCID → Onomondo SIM ID map for direct links
  const onomondoSimMap = new Map<string, string>()
  for (const sim of onomondoSims) {
    if (sim.iccid) onomondoSimMap.set(sim.iccid, sim.id)
  }

  // Fetch webhook activity stats per device
  const activeIccids = allActiveLabels
    .map((l) => l.iccid)
    .filter(Boolean) as string[]

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [webhookCounts24h, lastWebhooks] = activeIccids.length > 0
    ? await Promise.all([
        db.webhookLog.groupBy({
          by: ['iccid'],
          where: {
            iccid: { in: activeIccids },
            createdAt: { gte: twentyFourHoursAgo },
          },
          _count: { _all: true },
        }),
        db.webhookLog.findMany({
          where: { iccid: { in: activeIccids } },
          distinct: ['iccid'],
          orderBy: { createdAt: 'desc' },
          select: { iccid: true, createdAt: true, statusCode: true },
        }),
      ])
    : [[], []]

  const webhookCount24hMap = new Map<string, number>()
  for (const row of webhookCounts24h) {
    if (row.iccid) webhookCount24hMap.set(row.iccid, row._count._all)
  }

  const lastWebhookMap = new Map<string, { createdAt: Date; statusCode: number | null }>()
  for (const row of lastWebhooks) {
    if (row.iccid) lastWebhookMap.set(row.iccid, { createdAt: row.createdAt, statusCode: row.statusCode })
  }

  const referenceTime = new Date().getTime()

  type ActiveLabel = (typeof allActiveLabels)[number]

  // Compute health status for each label
  const labelsWithHealth = allActiveLabels.map((label: ActiveLabel) => {
    const isNoSignal = checkNoSignal(label.locations, referenceTime)
    const isLowBattery = label.batteryPct !== null && label.batteryPct < 20 && label.batteryPct > 0
    const health: 'healthy' | 'low_battery' | 'no_signal' = isNoSignal
      ? 'no_signal'
      : isLowBattery
        ? 'low_battery'
        : 'healthy'
    const webhookCount = label.iccid ? (webhookCount24hMap.get(label.iccid) ?? 0) : 0
    const lastWebhook = label.iccid ? lastWebhookMap.get(label.iccid) : undefined

    return { ...label, health, webhookCount, lastWebhook }
  })

  // Apply health filter
  const filteredLabels = healthFilter === 'SILENT'
    ? labelsWithHealth.filter((l) => l.webhookCount === 0)
    : healthFilter && healthFilter !== 'ALL'
      ? labelsWithHealth.filter((l) => l.health === healthFilter.toLowerCase())
      : labelsWithHealth

  // Pagination on filtered results
  const filteredTotal = filteredLabels.length
  const totalPages = Math.ceil(filteredTotal / perPage)
  const paginatedLabels = filteredLabels.slice((page - 1) * perPage, page * perPage)

  const [allCount, healthyCount, lowBatteryCount] = healthCounts
  const noSignalCount = labelsWithHealth.filter((l) => l.health === 'no_signal').length
  const silentCount = labelsWithHealth.filter((l) => l.webhookCount === 0).length

  const healthTabs = [
    { label: 'All', value: 'ALL', count: allCount, color: 'text-foreground' },
    { label: 'Healthy', value: 'HEALTHY', count: healthyCount, color: 'text-green-600 dark:text-green-400' },
    { label: 'Low Battery', value: 'LOW_BATTERY', count: lowBatteryCount, color: 'text-yellow-600 dark:text-yellow-400' },
    { label: 'No Signal', value: 'NO_SIGNAL', count: noSignalCount, color: 'text-red-600 dark:text-red-400' },
    { label: 'Silent', value: 'SILENT', count: silentCount, color: 'text-orange-600 dark:text-orange-400' },
  ]

  const currentHealth = healthFilter || 'ALL'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Device Dashboard</h1>
        <p className="text-muted-foreground">Fleet overview and device health monitoring</p>
      </div>

      {/* Fleet Overview Stats */}
      <FleetStatsGrid stats={fleetStats} />

      {/* Fleet Health: Battery Distribution + Signal Quality */}
      <div className="grid gap-4 md:grid-cols-2">
        <BatteryDistribution battery={fleetStats.battery} />
        <SignalQualityCard signal={fleetStats.signal} reporting={fleetStats.reporting} />
      </div>

      {/* Live SIM Status (Onomondo) */}
      <SimStatusPanel />

      {/* Geographic Distribution */}
      <GeoDistributionTable geography={fleetStats.geography} />

      {/* Reporting Frequency Chart */}
      <ReportingFrequencyChart data={reportingHistory} />

      {/* Health Filter Tabs */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        {healthTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'ALL' ? '/admin/devices' : `/admin/devices?health=${tab.value}${q ? `&q=${q}` : ''}`}
          >
            <Card className={`border-border bg-card transition-colors hover:border-border/80 ${currentHealth === tab.value ? 'border-primary' : ''}`}>
              <CardContent className="pt-6">
                <p className={`text-2xl font-bold ${tab.color}`}>{tab.count}</p>
                <p className="text-xs text-muted-foreground">{tab.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminSearch placeholder="Search by device ID or IMEI..." />

      {/* Devices Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Active Devices ({filteredTotal})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Real-time status of all tracking labels'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Device ID</th>
                  <th className="pb-3 font-medium">Shipment</th>
                  <th className="pb-3 font-medium">Battery</th>
                  <th className="pb-3 font-medium">Last Ping</th>
                  <th className="pb-3 font-medium">Last Webhook</th>
                  <th className="pb-3 font-medium">Webhooks (24h)</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedLabels.map((label) => {
                  const lastLocation = label.locations[0]

                  return (
                    <tr key={label.id} className="text-sm">
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/admin/devices/${label.deviceId}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {label.deviceId}
                          </Link>
                          <Link
                            href={`/admin/webhooks?q=${label.deviceId}`}
                            title="View webhooks"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Activity className="h-3 w-3" />
                          </Link>
                          {label.iccid && onomondoSimMap.has(label.iccid) && (
                            <a
                              href={`https://app.onomondo.com/sims/${onomondoSimMap.get(label.iccid)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open in Onomondo"
                              className="text-muted-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-foreground">
                        {label.shipments[0] ? (
                          <Link
                            href={`/admin/${label.shipments[0].type === 'LABEL_DISPATCH' ? 'dispatch' : 'cargo'}?q=${label.deviceId}`}
                            className="text-primary hover:underline"
                          >
                            {label.shipments[0].name || 'Untitled'}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">No shipment</span>
                        )}
                      </td>
                      <td className="py-3">
                        {label.batteryPct !== null ? (
                          <span className={label.health === 'low_battery' ? 'text-yellow-600 dark:text-yellow-400' : 'text-foreground'}>
                            {label.batteryPct}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {lastLocation ? (
                          <span className="inline-flex items-center gap-1.5">
                            {lastLocation.source === 'CELL_TOWER' ? (
                              <Radio className="h-3 w-3 text-purple-600 dark:text-purple-400" title="Onomondo" />
                            ) : (
                              <Satellite className="h-3 w-3 text-blue-600 dark:text-blue-400" title="Device" />
                            )}
                            {formatDistanceToNow(new Date(lastLocation.recordedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {label.lastWebhook ? (
                          <span className={label.lastWebhook.statusCode !== 200 ? 'text-red-500' : ''}>
                            {formatDistanceToNow(new Date(label.lastWebhook.createdAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span>Never</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className={label.webhookCount === 0 ? 'text-red-500 font-medium' : 'text-foreground'}>
                          {label.webhookCount}
                        </span>
                      </td>
                      <td className="py-3">
                        {lastLocation ? (
                          <div className="flex flex-col">
                            {lastLocation.geocodedCity && (
                              <span className="text-xs text-foreground">
                                {lastLocation.geocodedCity}
                              </span>
                            )}
                            <a
                              href={`https://www.google.com/maps?q=${lastLocation.latitude},${lastLocation.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <MapPin className="h-3 w-3" />
                              {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {label.health === 'no_signal' ? (
                          <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">No Signal</Badge>
                        ) : label.health === 'low_battery' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">Low Battery</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Healthy</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedLabels.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      {q ? 'No devices match your search' : 'No active devices'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({filteredTotal} total)</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/devices?${new URLSearchParams({ ...(q ? { q } : {}), ...(healthFilter ? { health: healthFilter } : {}), page: String(page - 1) }).toString()}`}
                    className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/devices?${new URLSearchParams({ ...(q ? { q } : {}), ...(healthFilter ? { health: healthFilter } : {}), page: String(page + 1) }).toString()}`}
                    className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
