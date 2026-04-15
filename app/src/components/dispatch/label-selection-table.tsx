'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Package, RefreshCw, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/format-date'

type AvailableLabel = {
  id: string
  deviceId: string
  displayId: string | null
  status: string
  batteryPct: number | null
}

type OrderGroup = {
  orderId: string
  createdAt: string
  quantity: number
  labels: AvailableLabel[]
}

type FlatLabelRow = {
  id: string
  deviceId: string
  displayId: string | null
  status: string
  batteryPct: number | null
  orderId: string
  orderCreatedAt: string
}

const statusStyles: Record<string, string> = {
  INVENTORY: 'bg-gray-500/20 text-muted-foreground',
  SOLD: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  ACTIVE: 'bg-green-500/20 text-green-600 dark:text-green-400',
  DEPLETED: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

interface LabelSelectionTableProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function LabelSelectionTable({ selectedIds, onChange }: LabelSelectionTableProps) {
  const [rows, setRows] = useState<FlatLabelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const fetchLabels = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/orders/available-labels')
      if (!res.ok) {
        throw new Error(`Failed to load labels (${res.status})`)
      }
      const data = (await res.json()) as { orders: OrderGroup[] }
      const flat: FlatLabelRow[] = (data.orders ?? []).flatMap((order) =>
        order.labels.map((label) => ({
          id: label.id,
          deviceId: label.deviceId,
          displayId: label.displayId,
          status: label.status,
          batteryPct: label.batteryPct,
          orderId: order.orderId,
          orderCreatedAt: order.createdAt,
        }))
      )
      setRows(flat)
      // Auto-select when only one label is available — no need to ask the
      // user to pick from a list of one. Mirrors the cargo form behavior.
      if (flat.length === 1) {
        onChange([flat[0].id])
      }
    } catch (err) {
      console.error('Failed to fetch available labels:', err)
      setError(err instanceof Error ? err.message : 'Failed to load labels')
    } finally {
      setLoading(false)
    }
  }, [onChange])

  useEffect(() => {
    fetchLabels()
  }, [fetchLabels])

  const visibleRows = useMemo(() => {
    if (!filter.trim()) return rows
    const q = filter.trim().toLowerCase()
    return rows.filter(
      (row) =>
        row.deviceId.toLowerCase().includes(q) ||
        row.displayId?.toLowerCase().includes(q) ||
        row.orderId.toLowerCase().includes(q)
    )
  }, [rows, filter])

  const visibleIds = useMemo(() => visibleRows.map((row) => row.id), [visibleRows])
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))

  const toggleRow = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((existing) => existing !== id)
        : [...selectedIds, id]
      onChange(next)
    },
    [selectedIds, onChange]
  )

  const toggleAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      onChange(selectedIds.filter((id) => !visibleIds.includes(id)))
    } else {
      const next = new Set(selectedIds)
      visibleIds.forEach((id) => next.add(id))
      onChange(Array.from(next))
    }
  }, [allVisibleSelected, onChange, selectedIds, visibleIds])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <AlertCircle className="mb-3 h-8 w-8 text-destructive" />
        <p className="text-sm font-medium">Failed to load labels</p>
        <p className="mt-1 text-xs text-muted-foreground">{error}</p>
        <Button onClick={fetchLabels} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try again
        </Button>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Package className="mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">No labels available for dispatch</p>
        <p className="mt-1 text-xs text-muted-foreground">
          All your labels are already in an active dispatch — buy more labels to dispatch a new batch.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link href="/buy">Buy labels</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter by device ID or order…"
            className="pl-9"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedIds.length > 0 ? (
            <>
              <span className="font-medium text-foreground">{selectedIds.length}</span> selected
              {filter ? ` · ${visibleRows.length} of ${rows.length} shown` : ` · ${rows.length} available`}
            </>
          ) : (
            <>
              {filter ? `${visibleRows.length} of ${rows.length}` : rows.length} label
              {rows.length !== 1 ? 's' : ''} available
            </>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <label className="flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      disabled={visibleRows.length === 0}
                      className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-2 focus:ring-primary"
                      aria-label="Select all visible labels"
                    />
                  </label>
                </th>
                <th className="px-3 py-3 font-medium">Device ID</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Battery</th>
                <th className="px-3 py-3 font-medium">Order</th>
                <th className="px-3 py-3 font-medium">Order date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row) => {
                const isSelected = selectedIds.includes(row.id)
                const labelId = row.displayId || row.deviceId
                return (
                  <tr
                    key={row.id}
                    onClick={() => toggleRow(row.id)}
                    className={cn(
                      'cursor-pointer text-sm transition-colors hover:bg-accent/40',
                      isSelected && 'bg-primary/10 hover:bg-primary/15'
                    )}
                  >
                    <td className="w-10 px-3 py-3">
                      <label
                        className="flex cursor-pointer items-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="h-4 w-4 rounded border-border bg-muted text-primary focus:ring-2 focus:ring-primary"
                          aria-label={`Select ${labelId}`}
                        />
                      </label>
                    </td>
                    <td className="px-3 py-3 font-mono text-foreground">{labelId}</td>
                    <td className="px-3 py-3">
                      <Badge className={statusStyles[row.status] ?? ''}>{row.status}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      {row.batteryPct !== null ? (
                        <span
                          className={
                            row.batteryPct < 20
                              ? 'text-destructive font-medium'
                              : 'text-foreground'
                          }
                        >
                          {row.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/orders/${row.orderId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-mono text-xs text-primary hover:underline"
                      >
                        #{row.orderId.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatDateTime(row.orderCreatedAt)}
                    </td>
                  </tr>
                )
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No labels match your filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
