import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { FleetStats } from '@/lib/fleet-stats'

interface GeoDistributionTableProps {
  geography: FleetStats['geography']
}

/** Convert ISO 3166-1 alpha-2 country code to flag emoji */
function countryCodeToFlag(code: string): string {
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...upper.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  )
}

export function GeoDistributionTable({ geography }: GeoDistributionTableProps) {
  if (geography.length === 0) {
    return null
  }

  const maxCount = geography[0]?.count ?? 1

  return (
    <Card className="border-gray-800 bg-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white">
          Geographic Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {geography.map((geo) => {
            const barPct = Math.max(5, (geo.count / maxCount) * 100)
            return (
              <div key={geo.country} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm">
                  {geo.countryCode ? countryCodeToFlag(geo.countryCode) : '🌍'}
                </span>
                <span className="min-w-[100px] text-xs text-gray-300">
                  {geo.country}
                </span>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-500/60 transition-all"
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
                <span className="min-w-[40px] text-right text-xs font-medium text-gray-400">
                  {geo.count.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
