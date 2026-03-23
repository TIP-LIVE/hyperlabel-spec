'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { cargoColumns, CargoRow } from './cargo-columns'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CargoListProps {
  initialStatus?: string
}

const POLL_INTERVAL_MS = 60_000 // Auto-refresh every 60 seconds

export function CargoList({ initialStatus }: CargoListProps) {
  const [allShipments, setAllShipments] = useState<CargoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && ['PENDING', 'IN_TRANSIT', 'DELIVERED'].includes(initialStatus)
      ? initialStatus
      : 'all'
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const initialLoadDone = useRef(false)

  const fetchShipments = useCallback(async (sync = false) => {
    if (!initialLoadDone.current) setLoading(true)
    setError(null)

    try {
      const url = sync ? '/api/v1/cargo?sync=true' : '/api/v1/cargo'
      const res = await fetch(url)

      if (!res.ok) {
        throw new Error(`Failed to load cargo shipments (${res.status})`)
      }

      const data = await res.json()
      const shipments = (data.shipments || []).map((s: CargoRow & { locations?: Array<{ id: string; latitude: number; longitude: number; recordedAt: string }> }) => ({
        ...s,
        latestLocation: s.locations?.[0] || null,
      }))
      setAllShipments(shipments)
    } catch (err) {
      console.error('Failed to fetch cargo shipments:', err)
      if (!initialLoadDone.current) setError(err instanceof Error ? err.message : 'Failed to load cargo shipments')
    } finally {
      setLoading(false)
      initialLoadDone.current = true
    }
  }, [])

  // Initial fetch, then sync fresh locations
  useEffect(() => {
    fetchShipments().then(() => {
      setRefreshing(true)
      fetchShipments(true).finally(() => setRefreshing(false))
    })
  }, [fetchShipments])

  // Re-fetch when a shipment is deleted from the actions menu
  useEffect(() => {
    const handler = () => fetchShipments()
    window.addEventListener('cargo-list-refresh', handler)
    return () => window.removeEventListener('cargo-list-refresh', handler)
  }, [fetchShipments])

  // Auto-poll every 60s when there are active shipments
  const hasActiveShipments = useMemo(
    () => allShipments.some((s) => s.status === 'PENDING' || s.status === 'IN_TRANSIT'),
    [allShipments]
  )

  useEffect(() => {
    if (!hasActiveShipments) return
    pollRef.current = setInterval(() => fetchShipments(), POLL_INTERVAL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [hasActiveShipments, fetchShipments])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await fetchShipments(true)
    } finally {
      setRefreshing(false)
    }
  }

  const statusCounts = useMemo(() => {
    return allShipments.reduce<Record<string, number>>(
      (acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1
        return acc
      },
      {}
    )
  }, [allShipments])

  const activeShipments = useMemo(
    () => allShipments.filter((s) => s.status !== 'CANCELLED'),
    [allShipments]
  )

  const filteredShipments = useMemo(() => {
    if (statusFilter === 'all') return activeShipments
    return activeShipments.filter((s) => s.status === statusFilter)
  }, [activeShipments, statusFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[220px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <AlertCircle className="mb-4 h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold">Failed to load cargo shipments</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => fetchShipments()} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses ({activeShipments.length})</SelectItem>
            <SelectItem value="PENDING">
              Pending{statusCounts.PENDING ? ` (${statusCounts.PENDING})` : ''}
            </SelectItem>
            <SelectItem value="IN_TRANSIT">
              In Transit{statusCounts.IN_TRANSIT ? ` (${statusCounts.IN_TRANSIT})` : ''}
            </SelectItem>
            <SelectItem value="DELIVERED">
              Delivered{statusCounts.DELIVERED ? ` (${statusCounts.DELIVERED})` : ''}
            </SelectItem>
          </SelectContent>
        </Select>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh locations</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{refreshing ? 'Syncing locations...' : 'Refresh locations'}</p>
          </TooltipContent>
        </Tooltip>
      </div>
      <DataTable
        columns={cargoColumns}
        data={filteredShipments}
        searchKey="name"
        searchPlaceholder="Search cargo shipments..."
        initialSorting={[{ id: 'lastUpdate', desc: true }]}
      />
    </div>
  )
}
