import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
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

export default async function AdminDevicesPage() {
  // Get all active labels with their latest location
  const activeLabels = await db.label.findMany({
    where: { status: 'ACTIVE' },
    include: {
      locations: {
        orderBy: { recordedAt: 'desc' },
        take: 1,
      },
      shipments: {
        where: { status: 'IN_TRANSIT' },
        take: 1,
        select: { name: true, shareCode: true },
      },
    },
    orderBy: { activatedAt: 'desc' },
  })

  // Use a reference time for all calculations (computed once after data fetch)
  const referenceTime = new Date().getTime()

  // Categorize by health status
  const healthy = activeLabels.filter(
    (l) => l.batteryPct !== null && l.batteryPct >= 20
  )
  const lowBattery = activeLabels.filter(
    (l) => l.batteryPct !== null && l.batteryPct < 20 && l.batteryPct > 0
  )
  const noSignal = activeLabels.filter((l) => checkNoSignal(l.locations, referenceTime))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Device Health</h1>
        <p className="text-gray-400">Monitor active tracking labels</p>
      </div>

      {/* Status Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-white">{activeLabels.length}</p>
            <p className="text-xs text-gray-500">Active Labels</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-green-400">{healthy.length}</p>
            <p className="text-xs text-gray-500">Healthy</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-yellow-400">{lowBattery.length}</p>
            <p className="text-xs text-gray-500">Low Battery</p>
          </CardContent>
        </Card>
        <Card className="border-gray-800 bg-gray-800/50">
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-red-400">{noSignal.length}</p>
            <p className="text-xs text-gray-500">No Signal (24h+)</p>
          </CardContent>
        </Card>
      </div>

      {/* Devices Table */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Active Devices</CardTitle>
          <CardDescription>Real-time status of all tracking labels</CardDescription>
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
                {activeLabels.map((label) => {
                  const lastLocation = label.locations[0]
                  const isLowBattery = label.batteryPct !== null && label.batteryPct < 20
                  const isNoSignal = checkNoSignal(
                    lastLocation ? [lastLocation] : [],
                    referenceTime
                  )

                  return (
                    <tr key={label.id} className="text-sm">
                      <td className="py-3 font-mono text-white">{label.deviceId}</td>
                      <td className="py-3 text-gray-300">
                        {label.shipments[0]?.name || (
                          <span className="text-gray-500">No shipment</span>
                        )}
                      </td>
                      <td className="py-3">
                        {label.batteryPct !== null ? (
                          <span className={isLowBattery ? 'text-yellow-400' : 'text-gray-300'}>
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
                      <td className="py-3 font-mono text-xs text-gray-400">
                        {lastLocation ? (
                          `${lastLocation.latitude.toFixed(4)}, ${lastLocation.longitude.toFixed(4)}`
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                      <td className="py-3">
                        {isNoSignal ? (
                          <Badge className="bg-red-500/20 text-red-400">No Signal</Badge>
                        ) : isLowBattery ? (
                          <Badge className="bg-yellow-500/20 text-yellow-400">Low Battery</Badge>
                        ) : (
                          <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {activeLabels.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No active devices
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
