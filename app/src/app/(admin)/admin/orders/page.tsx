import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { formatDateTime } from '@/lib/utils/format-date'
import { CreateDispatchButton } from '@/components/admin/create-dispatch-button'
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
      { id: { contains: q, mode: 'insensitive' } },
    ]
  }

  const [orders, totalCount, statusCounts] = await Promise.all([
    db.order.findMany({
      where,
      include: {
        user: { select: { email: true } },
        orderLabels: {
          include: {
            label: {
              select: {
                id: true,
                deviceId: true,
                displayId: true,
                status: true,
                shipmentLabels: {
                  where: {
                    shipment: { status: { in: ['PENDING', 'IN_TRANSIT', 'DELIVERED'] } },
                  },
                  select: {
                    shipment: { select: { status: true } },
                  },
                },
              },
            },
          },
        },
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
      db.order.count({ where: { status: 'CANCELLED' } }),
    ]),
  ])

  const totalPages = Math.ceil(totalCount / perPage)
  const [allCount, paidCount, shippedCount, deliveredCount, cancelledCount] = statusCounts

  const statusTabs = [
    { label: 'All', value: 'ALL', count: allCount },
    { label: 'Paid', value: 'PAID', count: paidCount },
    { label: 'Shipped', value: 'SHIPPED', count: shippedCount },
    { label: 'Delivered', value: 'DELIVERED', count: deliveredCount },
    { label: 'Cancelled', value: 'CANCELLED', count: cancelledCount },
  ]

  const currentStatus = statusFilter || 'ALL'

  // Compute dispatch info per order
  const ordersWithDispatchInfo = orders.map((order) => {
    const labels = order.orderLabels.map((ol) => {
      const activeDispatch = ol.label.shipmentLabels.find(
        (sl) => sl.shipment.status === 'PENDING' || sl.shipment.status === 'IN_TRANSIT'
      )
      const deliveredDispatch = ol.label.shipmentLabels.find(
        (sl) => sl.shipment.status === 'DELIVERED'
      )
      return {
        id: ol.label.id,
        deviceId: ol.label.deviceId,
        displayId: ol.label.displayId,
        status: ol.label.status,
        inActiveDispatch: !!(activeDispatch || deliveredDispatch),
        dispatchStatus: (activeDispatch || deliveredDispatch)?.shipment.status,
      }
    })
    const dispatchedCount = labels.filter((l) => l.inActiveDispatch).length
    const undispatchedCount = labels.filter(
      (l) => !l.inActiveDispatch && (l.status === 'SOLD' || l.status === 'INVENTORY' || l.status === 'ACTIVE')
    ).length
    return { ...order, labels, dispatchedCount, undispatchedCount }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
        <p className="text-muted-foreground">View and fulfill customer orders</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <AdminSearch placeholder="Search by email, order ID..." />
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
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label} ({tab.count})
          </Link>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-card-foreground">Orders ({totalCount})</CardTitle>
          <CardDescription>
            {q ? `Showing results for "${q}"` : 'Orders sorted by date (newest first)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersWithDispatchInfo.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-foreground">No orders found</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {q ? 'Try a different search term' : 'No orders yet'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-left text-sm text-muted-foreground">
                      <th className="pb-3 font-medium">Order</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Qty</th>
                      <th className="pb-3 font-medium">Labels</th>
                      <th className="pb-3 font-medium">Dispatched</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ordersWithDispatchInfo.map((order) => {
                      const orderShortId = order.id.slice(-8).toUpperCase()
                      return (
                        <tr key={order.id} className="text-sm">
                          <td className="py-3">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono text-primary hover:underline"
                            >
                              {orderShortId}
                            </Link>
                          </td>
                          <td className="py-3">
                            <Link
                              href={`/admin/users?q=${encodeURIComponent(order.user.email)}`}
                              className="text-primary hover:underline"
                            >
                              {order.user.email}
                            </Link>
                          </td>
                          <td className="py-3 font-semibold text-foreground">{order.quantity}</td>
                          <td className="py-3">
                            <span
                              className={`font-semibold ${
                                order.orderLabels.length < order.quantity
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-foreground'
                              }`}
                            >
                              {order.orderLabels.length}/{order.quantity}
                            </span>
                          </td>
                          <td className="py-3">
                            <span
                              className={`font-semibold ${
                                order.dispatchedCount > 0 && order.dispatchedCount < order.orderLabels.length
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : order.dispatchedCount === order.orderLabels.length && order.orderLabels.length > 0
                                  ? 'text-green-600 dark:text-green-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {order.dispatchedCount}/{order.orderLabels.length}
                            </span>
                          </td>
                          <td className="py-3">
                            <Badge className={orderStatusStyles[order.status as keyof typeof orderStatusStyles]}>{order.status}</Badge>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </td>
                          <td className="py-3">
                            {(order.status === 'PAID' || order.status === 'SHIPPED') && order.undispatchedCount > 0 && (
                              <CreateDispatchButton
                                orderId={order.id}
                                orderShortId={orderShortId}
                                availableLabelCount={order.undispatchedCount}
                              />
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalCount} total)</p>
                  <div className="flex gap-2">
                    {page > 1 && (
                      <Link
                        href={`/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page - 1) }).toString()}`}
                        className="rounded bg-muted px-3 py-1 text-sm text-foreground hover:bg-accent"
                      >
                        Previous
                      </Link>
                    )}
                    {page < totalPages && (
                      <Link
                        href={`/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(statusFilter ? { status: statusFilter } : {}), page: String(page + 1) }).toString()}`}
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
