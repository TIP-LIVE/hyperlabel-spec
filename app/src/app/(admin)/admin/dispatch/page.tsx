import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { formatDistanceToNow } from 'date-fns'
import { MapPin, Send } from 'lucide-react'
import { AdminSearch } from '@/components/admin/admin-search'
import { shipmentStatusStyles } from '@/lib/status-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Dispatch',
  description: 'View all label dispatch shipments across all users',
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

export default async function AdminDispatchPage({ searchParams }: PageProps) {
  const { q, status: statusFilter, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 25

  const where: Record<string, unknown> = { type: 'LABEL_DISPATCH' }

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { shareCode: { contains: q, mode: 'insensitive' } },
      { destinationAddress: { contains: q, mode: 'insensitive' } },
      { originAddress: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ]
  }

  const typeWhere = { type: 'LABEL_DISPATCH' as const }

  const [shipments, totalCount, statusCounts] = await Promise.all([
    db.shipment.findMany({
      where,
      include: {
        user: { select: { email: true } },
        shipmentLabels: {
          include: {
            label: { select: { deviceId: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.shipment.count({ where }),
    Promise.all([
      db.shipment.count({ where: typeWhere }),
      db.shipment.count({ where: { ...typeWhere, status: 'PENDING' } }),
      db.shipment.count({ where: { ...typeWhere, status: 'IN_TRANSIT' } }),
      db.shipment.count({ where: { ...typeWhere, status: 'DELIVERED' } }),
      db.shipment.count({ where: { ...typeWhere, status: 'CANCELLED' } }),
    ]),
  ])

  const totalPages = Math.ceil(totalCount / perPage)
  const [allCount, pendingCount, transitCount, deliveredCount, cancelledCount] = statusCounts

  const statusTabs = [
    { label: 'All', value: 'ALL', count: allCount },
    { label: 'Pending', value: 'PENDING', count: pendingCount },
    { label: 'In Transit', value: 'IN_TRANSIT', count: transitCount },
    { label: 'Delivered', value: 'DELIVERED', count: deliveredCount },
    { label: 'Cancelled', value: 'CANCELLED', count: cancelledCount },
  ]

  const currentStatus = statusFilter || 'ALL'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Label Dispatch</h1>
        <p className="text-gray-400">View label dispatch shipments across all users</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AdminSearch
          placeholder="Search by name, share code, address, email..."
          paramName="q"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/dispatch?${new URLSearchParams({
              ...(q ? { q } : {}),
              ...(tab.value !== 'ALL' ? { status: tab.value } : {}),
            }).toString()}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
              currentStatus === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">
            Label Dispatches ({totalCount})
          </CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'All label dispatch shipments sorted by date'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Send className="mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-semibold text-white">No dispatches found</h3>
              <p className="mt-1 text-sm text-gray-400">
                {q ? 'Try a different search term' : 'No label dispatches have been created yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                      <th className="pb-3 font-medium">Dispatch</th>
                      <th className="pb-3 font-medium">Shipper</th>
                      <th className="pb-3 font-medium">Labels</th>
                      <th className="pb-3 font-medium">Destination</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {shipments.map((s) => (
                      <tr key={s.id} className="text-sm">
                        <td className="py-3">
                          <Link
                            href={`/shipments/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.name || 'Untitled'}
                          </Link>
                          <p className="font-mono text-xs text-gray-500">{s.shareCode}</p>
                        </td>
                        <td className="py-3 text-gray-300">{s.user.email}</td>
                        <td className="py-3">
                          <span className="text-gray-300">
                            {s.shipmentLabels.length} label{s.shipmentLabels.length !== 1 ? 's' : ''}
                          </span>
                          {s.shipmentLabels.length > 0 && (
                            <p className="font-mono text-xs text-gray-500">
                              {s.shipmentLabels.map((sl) => sl.label.deviceId).join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="max-w-[200px] py-3">
                          {s.destinationAddress ? (
                            <div className="flex items-center gap-1" title={s.destinationAddress}>
                              <MapPin className="h-3 w-3 shrink-0 text-gray-500" />
                              <span className="truncate text-gray-300">
                                {s.destinationAddress}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge className={shipmentStatusStyles[s.status as keyof typeof shipmentStatusStyles] || ''}>{s.status}</Badge>
                        </td>
                        <td className="py-3 text-gray-400">
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </td>
                      </tr>
                    ))}
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
                        href={`/admin/dispatch?${new URLSearchParams({
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
                        href={`/admin/dispatch?${new URLSearchParams({
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
