'use client'

import { useState, useEffect, useCallback } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Package, ChevronDown, ChevronRight } from 'lucide-react'

type AvailableLabel = {
  id: string
  deviceId: string
  status: string
  batteryPct: number | null
}

type OrderGroup = {
  orderId: string
  createdAt: string
  quantity: number
  labels: AvailableLabel[]
}

interface MultiLabelSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function MultiLabelSelector({ selectedIds, onChange }: MultiLabelSelectorProps) {
  const [orders, setOrders] = useState<OrderGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchAvailableLabels() {
      try {
        const res = await fetch('/api/v1/orders/available-labels')
        if (res.ok) {
          const data = await res.json()
          setOrders(data.orders || [])
          // Auto-expand all orders
          setExpandedOrders(new Set((data.orders || []).map((o: OrderGroup) => o.orderId)))
        }
      } catch (error) {
        console.error('Failed to fetch available labels:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableLabels()
  }, [])

  const toggleLabel = useCallback(
    (labelId: string) => {
      const next = selectedIds.includes(labelId)
        ? selectedIds.filter((id) => id !== labelId)
        : [...selectedIds, labelId]
      onChange(next)
    },
    [selectedIds, onChange]
  )

  const toggleOrder = useCallback(
    (order: OrderGroup) => {
      const orderLabelIds = order.labels.map((l) => l.id)
      const allSelected = orderLabelIds.every((id) => selectedIds.includes(id))

      if (allSelected) {
        // Deselect all from this order
        onChange(selectedIds.filter((id) => !orderLabelIds.includes(id)))
      } else {
        // Select all from this order
        const newIds = new Set([...selectedIds, ...orderLabelIds])
        onChange(Array.from(newIds))
      }
    },
    [selectedIds, onChange]
  )

  const toggleExpanded = useCallback((orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) {
        next.delete(orderId)
      } else {
        next.add(orderId)
      }
      return next
    })
  }, [])

  const totalAvailable = orders.reduce((sum, o) => sum + o.labels.length, 0)

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading available labels...
      </div>
    )
  }

  if (totalAvailable === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center">
        <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          No labels available for dispatch. Labels must be purchased and in SOLD or INVENTORY status.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Selected count badge */}
      {selectedIds.length > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedIds.length} label{selectedIds.length !== 1 ? 's' : ''} selected
        </div>
      )}

      <div className="space-y-1 rounded-lg border p-2">
        {orders.map((order) => {
          const orderLabelIds = order.labels.map((l) => l.id)
          const selectedCount = orderLabelIds.filter((id) => selectedIds.includes(id)).length
          const allSelected = selectedCount === orderLabelIds.length
          const isExpanded = expandedOrders.has(order.orderId)

          return (
            <div key={order.orderId} className="rounded-md border">
              {/* Order header */}
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => toggleExpanded(order.orderId)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1 font-medium">
                  Order — {order.labels.length} label{order.labels.length !== 1 ? 's' : ''}
                </span>
                {selectedCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {selectedCount}
                  </span>
                )}
                <button
                  type="button"
                  className="rounded px-2 py-0.5 text-xs text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleOrder(order)
                  }}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </button>

              {/* Labels list */}
              {isExpanded && (
                <div className="border-t px-3 py-1">
                  {order.labels.map((label) => {
                    const isSelected = selectedIds.includes(label.id)

                    return (
                      <label
                        key={label.id}
                        className="flex min-h-[36px] cursor-pointer items-center gap-3 rounded px-1 py-1.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleLabel(label.id)}
                        />
                        <span className="flex-1 text-sm">{label.deviceId}</span>
                        {label.batteryPct !== null && (
                          <span className="text-xs text-muted-foreground">
                            {label.batteryPct}%
                          </span>
                        )}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                          {label.status}
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
