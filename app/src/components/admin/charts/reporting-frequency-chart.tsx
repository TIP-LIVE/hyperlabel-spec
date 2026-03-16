'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'

export interface ReportingDay {
  date: string // YYYY-MM-DD
  deviceCount: number
  onomondoCount: number
}

interface ReportingFrequencyChartProps {
  data: ReportingDay[]
}

export function ReportingFrequencyChart({ data }: ReportingFrequencyChartProps) {
  if (data.length === 0) return null

  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'MMM d'),
  }))

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Reporting Frequency (14 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={11}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelFormatter={(_v, payload) => {
                  if (payload?.[0]?.payload?.date) {
                    return format(new Date(payload[0].payload.date), 'PPP')
                  }
                  return ''
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
              />
              <Bar
                dataKey="deviceCount"
                name="Device"
                fill="#3b82f6"
                radius={[2, 2, 0, 0]}
                stackId="a"
              />
              <Bar
                dataKey="onomondoCount"
                name="Onomondo"
                fill="#a855f7"
                radius={[2, 2, 0, 0]}
                stackId="a"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
