import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FleetStats } from '@/lib/fleet-stats'

interface SignalQualityCardProps {
  signal: FleetStats['signal']
  reporting: FleetStats['reporting']
}

export function SignalQualityCard({ signal, reporting }: SignalQualityCardProps) {
  const totalSignal = signal.gpsCount + signal.cellTowerCount
  const gpsPct = totalSignal > 0 ? Math.round((signal.gpsCount / totalSignal) * 100) : 0
  const cellPct = totalSignal > 0 ? 100 - gpsPct : 0

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Signal &amp; Reporting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GPS vs Cell Tower bar */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>Device ({gpsPct}%)</span>
            <span>Onomondo ({cellPct}%)</span>
          </div>
          {totalSignal > 0 && (
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-blue-500 transition-all"
                style={{ width: `${gpsPct}%` }}
              />
              <div
                className="bg-purple-500 transition-all"
                style={{ width: `${cellPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Stats rows */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Device reports</span>
            <span className="text-sm font-medium text-foreground">
              {signal.gpsCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Onomondo reports</span>
            <span className="text-sm font-medium text-foreground">
              {signal.cellTowerCount.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Offline synced</span>
            <span className="text-sm font-medium text-foreground">
              {signal.offlineSyncCount.toLocaleString()}
              <span className="text-muted-foreground"> ({signal.offlineSyncPct}%)</span>
            </span>
          </div>

          <div className="border-t border-border pt-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Reports / 7d</span>
              <span className="text-sm font-medium text-foreground">
                {reporting.last7d.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Avg / device / day</span>
            <span className="text-sm font-medium text-foreground">
              {reporting.avgReportsPerDayPerDevice}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
