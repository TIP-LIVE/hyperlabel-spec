'use client'

import { useEffect, useState, useMemo } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { shipmentColumns, ShipmentRow } from './shipment-columns'
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

interface ShipmentsListProps {
  initialStatus?: string
}

export function ShipmentsList({ initialStatus }: ShipmentsListProps) {
  const [allShipments, setAllShipments] = useState<ShipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatus && ['PENDING', 'IN_TRANSIT', 'DELIVERED'].includes(initialStatus)
      ? initialStatus
      : 'all'
  )
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const fetchShipments = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/shipments')

      if (!res.ok) {
        throw new Error(`Failed to load shipments (${res.status})`)
      }

      const data = await res.json()
      // Extract latest location from locations array returned by API
      const shipments = (data.shipments || []).map((s: ShipmentRow & { locations?: Array<{ id: string; latitude: number; longitude: number; recordedAt: string }> }) => ({
        ...s,
        latestLocation: s.locations?.[0] || null,
      }))
      setAllShipments(shipments)
    } catch (err) {
      console.error('Failed to fetch shipments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShipments()
  }, [])

  // Status counts from full dataset
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

  // Client-side filters
  const filteredShipments = useMemo(() => {
    let result = activeShipments
    if (statusFilter !== 'all') {
      result = result.filter((s) => s.status === statusFilter)
    }
    if (typeFilter !== 'all') {
      result = result.filter((s) => s.type === typeFilter)
    }
    return result
  }, [activeShipments, statusFilter, typeFilter])

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
        <h3 className="text-lg font-semibold">Failed to load shipments</h3>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchShipments} variant="outline" className="mt-4">
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="CARGO_TRACKING">Cargo Tracking</SelectItem>
            <SelectItem value="LABEL_DISPATCH">Label Dispatch</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={shipmentColumns}
        data={filteredShipments}
        searchKey="name"
        searchPlaceholder="Search shipments..."
      />
    </div>
  )
}
