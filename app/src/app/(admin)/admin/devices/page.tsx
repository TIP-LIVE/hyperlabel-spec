import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { AdminSearch } from '@/components/admin/admin-search'
import { MapPin } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Device Health',
  description: 'Monitor active label devices',
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

  // Health filter applied after data fetch (requires computed fields)
  const [allActiveLabels, , healthCounts] = await Promise.all([
    db.label.findMany({
      where,
      include: {
        locations: {
          orderBy: { recordedAt: 'desc' as const },
          take: 1,
        },
        shipments: {
          where: { status: 'IN_TRANSIT' },
          take: 1,
          select: { name: true, shareCode: true },
        },
      },
      orderBy: { activatedAt: 'desc' },
    }),
    db.label.count({ where }),
    Promise.all([
      db.label.count({ where: { status: 'ACTIVE' } }),
      db.label.count({
        where: { status: 'ACTIVE', batteryPct: { gte: 20 } },
      }),
      db.label.count({
        where: { status: 'ACTIVE', batteryPct: { lt: 20, gt: 0 } },
      }),
    ]),
  ])

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
    return { ...label, health }
  })

  // Apply health filter
  const filteredLabels = healthFilter && healthFilter !== 'ALL'
    ? labelsWithHealth.filter((l) => l.health === healthFilter.toLowerCase())
    : labelsWithHealth

  // Pagination on filtered results
  const filteredTotal = filteredLabels.length
  const totalPages = Math.ceil(filteredTotal / perPage)
  const paginatedLabels = filteredLabels.slice((page - 1) * perPage, page * perPage)

  const [allCount, healthyCount, lowBatteryCount] = healthCounts
  // Approximate no-signal count
  const noSignalCount = labelsWithHealth.filter((l) => l.health === 'no_signal').length

  const healthTabs = [
    { label: 'All', value: 'ALL', count: allCount, color: 'text-white' },
    { label: 'Healthy', value: 'HEALTHY', count: healthyCount, color: 'text-green-400' },
    { label: 'Low Battery', value: 'LOW_BATTERY', count: lowBatteryCount, color: 'text-yellow-400' },
    { label: 'No Signal', value: 'NO_SIGNAL', count: noSignalCount, color: 'text-red-400' },
  ]

  const currentHealth = healthFilter || 'ALL'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Device Health</h1>
        <p className="text-gray-400">Monitor active tracking labels</p>
      </div>

      {/* Health Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {healthTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === 'ALL' ? '/admin/devices' : `/admin/devices?health=${tab.value}${q ? `&q=${q}` : ''}`}
          >
            <Card className={`border-gray-800 bg-gray-800/50 transition-colors hover:border-gray-600 ${currentHealth === tab.value ? 'border-primary' : ''}`}>
              <CardContent className="pt-6">
                <p className={`text-2xl font-bold ${tab.color}`}>{tab.count}</p>
                <p className="text-xs text-gray-500">{tab.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <AdminSearch placeholder="Search by device ID or IMEI..." />

      {/* Devices Table */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Active Devices ({filteredTotal})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Real-time status of all tracking labels'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="pb-3 font-medium">Device ID</th>
                  <th className="pb-3 font-medium">Shipment</th>
                  <th className="pb-3 font-medium">Battery</th>
                  <th className="pb-3 font-medium">Last Ping</th>
                  <th className="pb-3 font-medium">Location</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {paginatedLabels.map((label) => {
                  const lastLocation = label.locations[0]

                  return (
                    <tr key={label.id} className="text-sm">
                      <td className="py-3 font-mono text-white">{label.deviceId}</td>
                      <td className="py-3 text-gray-300">
                        {label.shipments[0] ? (
                          <Link
                            href={`/admin/shipments?q=${label.deviceId}`}
                            className="text-primary hover:underline"
                          >
                            {label.shipments[0].name || 'Untitled'}
                          </Link>
                        ) : (
                          <span className="text-gray-500">No shipment</span>
                        )}
                      </td>
                      <td className="py-3">
                        {label.batteryPct !== null ? (
                          <span className={label.health === 'low_battery' ? 'text-yellow-400' : 'text-gray-300'}>
                            {label.batteryPct}%
                          </span>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-400">
                        {lastLocation ? (
                          formatDistanceToNow(new Date(lastLocation.recordedAt), {
                            addSuffix: true,
                          })
                        ) : (
                          <span className="text-gray-500">Never</span>
                        )}
                      </td>
                      <td className="py-3">
                        {lastLocation ? (
                          <a
                            href={`https://www.google.com/maps?q=${lastLocation.latitude},${lastLocation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <MapPin className="h-3 w-3" />
                            {lastLocation.latitude.toFixed(4)}, {lastLocation.longitude.toFixed(4)}
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {label.health === 'no_signal' ? (
                          <Badge className="bg-red-500/20 text-red-400">No Signal</Badge>
                        ) : label.health === 'low_battery' ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Low Battery</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {paginatedLabels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      {q ? 'No devices match your search' : 'No active devices'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400">Page {page} of {totalPages} ({filteredTotal} total)</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/devices?${new URLSearchParams({ ...(q ? { q } : {}), ...(healthFilter ? { health: healthFilter } : {}), page: String(page - 1) }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/devices?${new URLSearchParams({ ...(q ? { q } : {}), ...(healthFilter ? { health: healthFilter } : {}), page: String(page + 1) }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
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
