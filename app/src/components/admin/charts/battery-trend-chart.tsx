'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { useTheme } from 'next-themes'

interface BatteryDataPoint {
  recordedAt: string // ISO date string
  batteryPct: number | null
}

interface BatteryTrendChartProps {
  data: BatteryDataPoint[]
}

export function BatteryTrendChart({ data }: BatteryTrendChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? '#374151' : '#e5e7eb'
  const axisColor = isDark ? '#6b7280' : '#9ca3af'
  const tooltipBg = isDark ? '#1f2937' : '#ffffff'
  const tooltipBorder = isDark ? '#374151' : '#e5e7eb'
  const dotStroke = isDark ? '#1f2937' : '#ffffff'

  const chartData = data
    .filter((d) => d.batteryPct !== null)
    .reverse() // oldest first for left-to-right
    .map((d) => ({
      time: new Date(d.recordedAt).getTime(),
      battery: d.batteryPct,
    }))

  if (chartData.length < 2) {
    return null
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Battery Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="batteryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => format(new Date(v), 'MMM d')}
                stroke={axisColor}
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                stroke={axisColor}
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: tooltipBg,
                  border: `1px solid ${tooltipBorder}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => format(new Date(v as number), 'PPp')}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={((v: number) => [`${v}%`, 'Battery']) as any}
              />
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="battery"
                stroke="#22c55e"
                fill="url(#batteryGradient)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e', stroke: dotStroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
