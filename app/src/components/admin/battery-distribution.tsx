import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FleetStats } from '@/lib/fleet-stats'

interface BatteryDistributionProps {
  battery: FleetStats['battery']
}

const segments = [
  { key: 'excellent' as const, label: '80-100%', color: 'bg-green-500' },
  { key: 'good' as const, label: '50-79%', color: 'bg-green-400' },
  { key: 'fair' as const, label: '20-49%', color: 'bg-yellow-400' },
  { key: 'low' as const, label: '1-19%', color: 'bg-orange-400' },
  { key: 'dead' as const, label: '0%', color: 'bg-red-500' },
  { key: 'unknown' as const, label: 'Unknown', color: 'bg-gray-500' },
]

export function BatteryDistribution({ battery }: BatteryDistributionProps) {
  const total = Object.values(battery).reduce((sum, v) => sum + v, 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Battery Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stacked bar */}
        {total > 0 && (
          <div className="flex h-4 overflow-hidden rounded-full bg-muted">
            {segments.map((seg) => {
              const value = battery[seg.key]
              if (value === 0) return null
              const pct = (value / total) * 100
              return (
                <div
                  key={seg.key}
                  className={`${seg.color} transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${seg.label}: ${value} (${Math.round(pct)}%)`}
                />
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2">
          {segments.map((seg) => {
            const value = battery[seg.key]
            const pct = total > 0 ? Math.round((value / total) * 100) : 0
            return (
              <div key={seg.key} className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
                <span className="text-xs text-muted-foreground">
                  {seg.label}
                </span>
                <span className="ml-auto text-xs font-medium text-foreground">
                  {value}
                  {total > 0 && (
                    <span className="text-muted-foreground"> ({pct}%)</span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
