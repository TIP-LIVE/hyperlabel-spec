'use client'

import { useEffect, useState } from 'react'
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

export function ShipmentsList() {
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchShipments = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const res = await fetch(`/api/v1/shipments?${params.toString()}`)
      
      if (!res.ok) {
        throw new Error(`Failed to load shipments (${res.status})`)
      }
      
      const data = await res.json()
      setShipments(data.shipments || [])
    } catch (err) {
      console.error('Failed to fetch shipments:', err)
      setError(err instanceof Error ? err.message : 'Failed to load shipments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShipments()
  }, [statusFilter])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-[200px]" />
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
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={shipmentColumns}
        data={shipments}
        searchKey="name"
        searchPlaceholder="Search shipments..."
      />
    </div>
  )
}
