import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/db'
import { format } from 'date-fns'
import { MarkShippedButton } from '@/components/admin/mark-shipped-button'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Order Management',
  description: 'Manage HyperLabel orders',
}

const statusStyles = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  PAID: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default async function AdminOrdersPage() {
  const orders = await db.order.findMany({
    include: {
      user: { select: { email: true } },
      _count: { select: { labels: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Order Management</h1>
        <p className="text-gray-400">View and fulfill customer orders</p>
      </div>

      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader>
          <CardTitle className="text-white">All Orders ({orders.length})</CardTitle>
          <CardDescription>Orders sorted by date (newest first)</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="mb-4 h-12 w-12 text-gray-600" />
              <h3 className="text-lg font-semibold text-white">No orders yet</h3>
              <p className="mt-1 max-w-sm text-sm text-gray-400">
                When customers purchase labels, their orders will appear here for fulfillment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-sm text-gray-400">
                    <th className="pb-3 font-medium">Order ID</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Labels Assigned</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Tracking #</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map((order) => (
                    <tr key={order.id} className="text-sm">
                      <td className="py-3 font-mono text-white">
                        {order.id.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3 text-gray-300">{order.user.email}</td>
                      <td className="py-3 text-gray-300">{order.quantity}</td>
                      <td className="py-3">
                        <span
                          className={
                            order._count.labels < order.quantity
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                          }
                        >
                          {order._count.labels}/{order.quantity}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge className={statusStyles[order.status]}>{order.status}</Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
