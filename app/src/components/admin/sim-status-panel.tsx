'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wifi, WifiOff, HardDrive, RefreshCw } from 'lucide-react'

interface SimSummary {
  onlineCount: number
  offlineCount: number
  totalBytes: number
  total: number
}

interface SimStatusResponse {
  summary: SimSummary
  onomondoAvailable: boolean
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

export function SimStatusPanel() {
  const [data, setData] = useState<SimStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/v1/admin/devices/sims')
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setData(json)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center justify-center py-8">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading SIM status...</span>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground">
            Unable to fetch Onomondo SIM status. Check ONOMONDO_API_KEY.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!data.onomondoAvailable) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Live SIM Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Onomondo API unavailable. {data.summary.total} SIM{data.summary.total !== 1 ? 's' : ''} registered locally.
          </p>
        </CardContent>
      </Card>
    )
  }

  const { summary } = data

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-card-foreground">
            Live SIM Status
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">via Onomondo · auto-refreshes</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 grid-cols-3">
          {/* Online */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{summary.onlineCount}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
          </div>

          {/* Offline */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
              <WifiOff className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xl font-bold text-muted-foreground">{summary.offlineCount}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
          </div>

          {/* Data Usage */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <HardDrive className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatBytes(summary.totalBytes)}</p>
              <p className="text-xs text-muted-foreground">Data used</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
