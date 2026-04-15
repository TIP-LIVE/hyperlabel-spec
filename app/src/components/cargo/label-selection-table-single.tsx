'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils/format-date'

/**
 * Label shape consumed by the cargo table. Matches the extended
 * `/api/v1/labels?status=SOLD` response — see
 * `app/src/app/api/v1/labels/route.ts`. `orderId`/`orderCreatedAt` are
 * null for labels attached via admin-assigned dispatches (no orderLabel).
 */
export type CargoLabelRow = {
  id: string
  deviceId: string
  displayId: string | null
  status: string
  batteryPct: number | null
  lastSeenAt: string | null
  orderId: string | null
  orderCreatedAt: string | null
}

const statusStyles: Record<string, string> = {
  INVENTORY: 'bg-gray-500/20 text-muted-foreground',
  SOLD: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  ACTIVE: 'bg-green-500/20 text-green-600 dark:text-green-400',
  DEPLETED: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

/**
 * Subline shown under the Status badge. "Last seen" prefix is implied by
 * the column header, so we keep it short — just the relative time, or
 * "Awaiting signal" when the label has never phoned home.
 */
function formatLastSeenSubline(label: CargoLabelRow): string {
  if (label.status === 'ACTIVE' && label.lastSeenAt) {
    return formatDistanceToNow(new Date(label.lastSeenAt), { addSuffix: true })
  }
  return 'Awaiting signal'
}

interface LabelSelectionTableSingleProps {
  labels: CargoLabelRow[]
  loading: boolean
  selectedId: string | null
  onChange: (id: string) => void
}

export function LabelSelectionTableSingle({
  labels,
  loading,
  selectedId,
  onChange,
}: LabelSelectionTableSingleProps) {
  const [filter, setFilter] = useState('')

  const visibleRows = useMemo(() => {
    if (!filter.trim()) return labels
    const q = filter.trim().toLowerCase()
    return labels.filter(
      (row) =>
        row.deviceId.toLowerCase().includes(q) ||
        row.displayId?.toLowerCase().includes(q) ||
        row.orderId?.toLowerCase().includes(q)
    )
  }, [labels, filter])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-full max-w-sm" />
        <Skeleton className="h-[260px] w-full" />
      </div>
    )
  }

  // Empty state is owned by the form so CTAs (Dispatch / Buy) can live
  // there. Hide the table entirely when there's nothing to select.
  if (labels.length === 0) {
    return null
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
          {selectedId ? (
            <>
              <span className="font-medium text-foreground">1</span> selected
              {filter
                ? ` · ${visibleRows.length} of ${labels.length} shown`
                : ` · ${labels.length} available`}
            </>
          ) : (
            <>
              {filter ? `${visibleRows.length} of ${labels.length}` : labels.length} label
              {labels.length !== 1 ? 's' : ''} available
            </>
          )}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="w-10 px-3 py-3" aria-label="Select" />
                <th className="px-3 py-3 font-medium">Device ID</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Battery</th>
                <th className="px-3 py-3 font-medium">Order</th>
                <th className="px-3 py-3 font-medium">Order date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRows.map((row) => {
                const isSelected = selectedId === row.id
                const labelId = row.displayId || row.deviceId
                return (
                  <tr
                    key={row.id}
                    onClick={() => onChange(row.id)}
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
                          type="radio"
                          name="cargo-label"
                          checked={isSelected}
                          onChange={() => onChange(row.id)}
                          className="h-4 w-4 border-border bg-muted text-primary focus:ring-2 focus:ring-primary"
                          aria-label={`Select ${labelId}`}
                        />
                      </label>
                    </td>
                    <td className="px-3 py-3 font-mono text-foreground">{labelId}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-0.5">
                        <Badge className={cn('w-fit', statusStyles[row.status] ?? '')}>
                          {row.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatLastSeenSubline(row)}
                        </span>
                      </div>
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
                      {row.orderId ? (
                        <Link
                          href={`/orders/${row.orderId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          #{row.orderId.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {row.orderCreatedAt ? formatDateTime(row.orderCreatedAt) : '—'}
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
