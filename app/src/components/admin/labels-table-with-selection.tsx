'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { Building2, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, string> = {
  INVENTORY: 'bg-gray-500/20 text-gray-400',
  SOLD: 'bg-blue-500/20 text-blue-400',
  ACTIVE: 'bg-green-500/20 text-green-400',
  DEPLETED: 'bg-red-500/20 text-red-400',
}

export type LabelRow = {
  id: string
  deviceId: string
  imei: string | null
  status: string
  batteryPct: number | null
  activatedAt: Date | null
  orderLabels: Array<{
    order: { id: string; user: { email: string | null } } | null
  }>
}

interface LabelsTableWithSelectionProps {
  labels: LabelRow[]
  totalCount: number
  q?: string
  page: number
  statusFilter?: string
  totalPages: number
}

export function LabelsTableWithSelection({
  labels,
  totalCount,
  q,
  page,
  statusFilter,
  totalPages,
}: LabelsTableWithSelectionProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const onPageDeviceIds = labels.map((l) => l.deviceId)
  const allOnPageSelected =
    onPageDeviceIds.length > 0 && onPageDeviceIds.every((id) => selectedIds.has(id))

  const toggleOne = (deviceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) next.delete(deviceId)
      else next.add(deviceId)
      return next
    })
  }

  const toggleAllOnPage = () => {
    if (allOnPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        onPageDeviceIds.forEach((id) => next.delete(id))
        return next
      })
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        onPageDeviceIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const assignHref =
    selectedIds.size > 0
      ? `/admin/labels/assign?ids=${encodeURIComponent([...selectedIds].join(','))}`
      : '/admin/labels/assign'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Label Inventory</h1>
          <p className="text-gray-400">Track and manage all labels</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild className="border-gray-600">
            <Link href={assignHref}>
              <Building2 className="mr-2 h-4 w-4" />
              {selectedIds.size > 0
                ? `Assign to org(s) (${selectedIds.size})`
                : 'Assign to org(s)'}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/labels/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Labels
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">Labels ({totalCount})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Complete inventory list'}
            {selectedIds.size > 0 && (
              <span className="ml-2 text-primary">
                — {selectedIds.size} selected for assignment
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                  <th className="w-10 pb-3 pr-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-2 focus:ring-primary"
                        aria-label="Select all on page"
                      />
                      <span className="sr-only">Select all</span>
                    </label>
                  </th>
                  <th className="pb-3 font-medium">Device ID</th>
                  <th className="pb-3 font-medium">IMEI</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Battery</th>
                  <th className="pb-3 font-medium">Owner</th>
                  <th className="pb-3 font-medium">Activated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {labels.map((label) => (
                  <tr
                    key={label.id}
                    className={cn(
                      'text-sm',
                      selectedIds.has(label.deviceId) && 'bg-primary/10'
                    )}
                  >
                    <td className="w-10 py-3 pr-2">
                      <label className="flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(label.deviceId)}
                          onChange={() => toggleOne(label.deviceId)}
                          className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-primary focus:ring-2 focus:ring-primary"
                          aria-label={`Select ${label.deviceId}`}
                        />
                      </label>
                    </td>
                    <td className="py-3 font-mono text-white">{label.deviceId}</td>
                    <td className="py-3 font-mono text-gray-400">{label.imei || '—'}</td>
                    <td className="py-3">
                      <Badge className={statusStyles[label.status]}>{label.status}</Badge>
                    </td>
                    <td className="py-3">
                      {label.batteryPct !== null ? (
                        <span
                          className={
                            label.batteryPct < 20 ? 'text-red-400' : 'text-gray-300'
                          }
                        >
                          {label.batteryPct}%
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3 text-gray-300">
                      {label.orderLabels[0]?.order?.user?.email ?? '—'}
                    </td>
                    <td className="py-3 text-gray-400">
                      {label.activatedAt
                        ? format(new Date(label.activatedAt), 'PP')
                        : '—'}
                    </td>
                  </tr>
                ))}
                {labels.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      {q ? 'No labels match your search' : 'No labels in inventory'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400">
                Page {page} of {totalPages} ({totalCount} total)
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/admin/labels?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(statusFilter ? { status: statusFilter } : {}),
                      page: String(page - 1),
                    }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/admin/labels?${new URLSearchParams({
                      ...(q ? { q } : {}),
                      ...(statusFilter ? { status: statusFilter } : {}),
                      page: String(page + 1),
                    }).toString()}`}
                    className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
