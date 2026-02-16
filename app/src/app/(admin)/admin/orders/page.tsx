import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { MarkShippedButton } from '@/components/admin/mark-shipped-button'
import { Package } from 'lucide-react'
import { AdminSearch } from '@/components/admin/admin-search'
import { orderStatusStyles } from '@/lib/status-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order Management',
  description: 'Manage TIP orders',
}

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const { q, status: statusFilter, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const perPage = 25

  const where: Record<string, unknown> = {}

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter
  }

  if (q) {
    where.OR = [
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { trackingNumber: { contains: q, mode: 'insensitive' } },
      { id: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [orders, totalCount, statusCounts] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { email: true } },
        _count: { select: { orderLabels: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.order.count({ where }),
    Promise.all([
      db.order.count(),
      db.order.count({ where: { status: 'PAID' } }),
      db.order.count({ where: { status: 'SHIPPED' } }),
      db.order.count({ where: { status: 'DELIVERED' } }),
    ]),
  ])

  const totalPages = Math.ceil(totalCount / perPage)
  const [allCount, paidCount, shippedCount, deliveredCount] = statusCounts

  const statusTabs = [
    { label: 'All', value: 'ALL', count: allCount },
    { label: 'Paid', value: 'PAID', count: paidCount },
    { label: 'Shipped', value: 'SHIPPED', count: shippedCount },
    { label: 'Delivered', value: 'DELIVERED', count: deliveredCount },
  ]

  const currentStatus = statusFilter || 'ALL'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Order Management</h1>
        <p className="text-gray-400">View and fulfill customer orders</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AdminSearch placeholder="Search by email, order ID, tracking #..." />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {statusTabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/orders?${new URLSearchParams({
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
          <CardTitle className="text-white">Orders ({totalCount})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Orders sorted by date (newest first)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-semibold text-white">No orders found</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-400">
                {q ? 'Try a different search term' : 'No orders yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                      <th className="pb-3 font-medium">Order</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Qty</th>
                      <th className="pb-3 font-medium">Labels</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Tracking #</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {orders.map((order) => (
                      <tr key={order.id} className="text-sm">
                        <td className="py-3">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-mono text-primary hover:underline"
                          >
                            {order.id.slice(-8).toUpperCase()}
                          </Link>
                        </td>
                        <td className="py-3 text-gray-300">{order.user.email}</td>
                        <td className="py-3 text-gray-300">{order.quantity}</td>
                        <td className="py-3">
                          <span
                            className={
                              order._count.orderLabels < order.quantity
                                ? 'text-yellow-400'
                                : 'text-gray-300'
                            }
                          >
                            {order._count.orderLabels}/{order.quantity}
                          </span>
                        </td>
                        <td className="py-3">
                          <Badge className={orderStatusStyles[order.status as keyof typeof orderStatusStyles]}>{order.status}</Badge>
                        </td>
                        <td className="py-3 font-mono text-gray-400">
                          {order.trackingNumber || '—'}
                        </td>
                        <td className="py-3 text-gray-400">
                          {format(new Date(order.createdAt), 'PP')}
                        </td>
                        <td className="py-3">
                          {order.status === 'PAID' && (
                            <MarkShippedButton orderId={order.id} />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-700 pt-4">
                  <p className="text-sm text-gray-400">Page {page} of {totalPages} ({totalCount} total)</p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page - 1) }).toString()}`}
                        className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-300 hover:bg-gray-700"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page + 1) }).toString()}`}
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
