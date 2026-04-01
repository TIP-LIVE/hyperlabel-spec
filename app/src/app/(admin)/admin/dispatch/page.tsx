import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { timeAgo } from '@/lib/utils/time-ago'
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
        <h1 className="text-2xl font-bold text-foreground">Label Dispatch</h1>
        <p className="text-muted-foreground">View label dispatch shipments across all users</p>
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
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">
            Label Dispatches ({totalCount})
          </CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'All label dispatch shipments sorted by date'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Send className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No dispatches found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {q ? 'Try a different search term' : 'No label dispatches have been created yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Dispatch</th>
                      <th className="pb-3 font-medium">Shipper</th>
                      <th className="pb-3 font-medium">Labels</th>
                      <th className="pb-3 font-medium">Destination</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {shipments.map((s) => (
                      <tr key={s.id} className="text-sm">
                        <td className="py-3">
                          <Link
                            href={`/dispatch/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.name || 'Untitled'}
                          </Link>
                          <p className="font-mono text-xs text-muted-foreground">{s.shareCode}</p>
                        </td>
                        <td className="py-3">
                          <Link
                            href={`/admin/users?q=${encodeURIComponent(s.user.email)}`}
                            className="text-primary hover:underline"
                          >
                            {s.user.email}
                          </Link>
                        </td>
                        <td className="py-3">
                          <span className="text-foreground">
                            {s.shipmentLabels.length} label{s.shipmentLabels.length !== 1 ? 's' : ''}
                          </span>
                          {s.shipmentLabels.length > 0 && (
                            <p className="font-mono text-xs">
                              {s.shipmentLabels.map((sl, i) => (
                                <span key={sl.label.deviceId}>
                                  {i > 0 && ', '}
                                  <Link
                                    href={`/admin/devices/${sl.label.deviceId}`}
                                    className="text-primary hover:underline"
                                  >
                                    {sl.label.deviceId}
                                  </Link>
                                </span>
                              ))}
                            </p>
                          )}
                        </td>
                        <td className="max-w-[200px] py-3">
                          {s.destinationAddress ? (
                            <div className="flex items-center gap-1" title={s.destinationAddress}>
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate text-foreground">
                                {s.destinationAddress}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge className={shipmentStatusStyles[s.status as keyof typeof shipmentStatusStyles] || ''}>{s.status}</Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {timeAgo(s.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">
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
                        className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
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
                        className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
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
