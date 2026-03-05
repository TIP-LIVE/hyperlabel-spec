'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

interface BatteryDataPoint {
  recordedAt: string // ISO date string
  batteryPct: number | null
}

interface BatteryTrendChartProps {
  data: BatteryDataPoint[]
}

export function BatteryTrendChart({ data }: BatteryTrendChartProps) {
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
    <Card className="border-gray-800 bg-gray-800/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-white">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="time"
                type="number"
                domain={['dataMin', 'dataMax']}
                tickFormatter={(v) => format(new Date(v), 'MMM d')}
                stroke="#6b7280"
                fontSize={11}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#6b7280"
                fontSize={11}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(v) => format(new Date(v as number), 'PPp')}
                formatter={(v: number) => [`${v}%`, 'Battery']}
              />
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
              <Area
                type="monotone"
                dataKey="battery"
                stroke="#22c55e"
                fill="url(#batteryGradient)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#22c55e', stroke: '#1f2937', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
