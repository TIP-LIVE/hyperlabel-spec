import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, MapPin, Truck, CreditCard, User } from 'lucide-react'
import { MarkShippedButton } from '@/components/admin/mark-shipped-button'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return { title: `Order ${id.slice(-8).toUpperCase()}` }
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-gray-500/20 text-gray-400',
  PAID: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-blue-500/20 text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      labels: {
        select: {
          id: true,
          deviceId: true,
          status: true,
          batteryPct: true,
          activatedAt: true,
        },
      },
    },
  })

  if (!order) notFound()

  const shippingAddress = order.shippingAddress as {
    line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string
  } | null

  const currencySymbol = order.currency === 'GBP' ? '\u00a3' : order.currency === 'EUR' ? '\u20ac' : '$'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white" asChild>
        <Link href="/admin/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Order {order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-gray-400">
            {format(new Date(order.createdAt), 'PPPp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusStyles[order.status]}>{order.status}</Badge>
          {order.status === 'PAID' && <MarkShippedButton orderId={order.id} />}
        </div>
      </div>

      {/* Customer */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-white">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="text-white">{order.user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span className="text-gray-300">
              {[order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <CreditCard className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-white">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Quantity</span>
            <span className="text-white">{order.quantity} label{order.quantity > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Unit price</span>
            <span className="text-gray-300">
              {currencySymbol}{(order.totalAmount / order.quantity / 100).toFixed(2)}
            </span>
          </div>
          <Separator className="bg-gray-700" />
          <div className="flex justify-between font-semibold">
            <span className="text-gray-400">Total</span>
            <span className="text-white">
              {currencySymbol}{(order.totalAmount / 100).toFixed(2)} {order.currency}
            </span>
          </div>
          {order.stripePaymentId && (
            <div className="flex justify-between">
              <span className="text-gray-400">Stripe Payment</span>
              <span className="font-mono text-xs text-gray-500">{order.stripePaymentId}</span>
            </div>
          )}
          {order.stripeSessionId && (
            <div className="flex justify-between">
              <span className="text-gray-400">Stripe Session</span>
              <span className="font-mono text-xs text-gray-500">{order.stripeSessionId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <Truck className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-white">Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {shippingAddress ? (
            <div className="space-y-1">
              <p className="text-gray-400">Delivery address</p>
              <div className="flex items-start gap-2 text-gray-300">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" />
                <div>
                  {shippingAddress.line1 && <p>{shippingAddress.line1}</p>}
                  {shippingAddress.line2 && <p>{shippingAddress.line2}</p>}
                  <p>
                    {[shippingAddress.city, shippingAddress.state, shippingAddress.postal_code]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {shippingAddress.country && <p>{shippingAddress.country}</p>}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No shipping address on file</p>
          )}

          {order.shippedAt && (
            <div className="flex justify-between">
              <span className="text-gray-400">Shipped on</span>
              <span className="text-gray-300">{format(new Date(order.shippedAt), 'PPPp')}</span>
            </div>
          )}
          {order.trackingNumber && (
            <div className="flex justify-between">
              <span className="text-gray-400">Tracking</span>
              <a
                href={`https://track.aftership.com/${order.trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-primary hover:underline"
              >
                {order.trackingNumber}
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Labels */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-white">
            Labels ({order.labels.length}/{order.quantity})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.labels.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500">
              No labels assigned to this order yet
            </p>
          ) : (
            <div className="space-y-2">
              {order.labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between rounded-lg border border-gray-700 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-mono text-sm text-white">{label.deviceId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {label.batteryPct !== null && (
                      <span className={`text-xs ${label.batteryPct < 20 ? 'text-red-400' : 'text-gray-500'}`}>
                        {label.batteryPct}%
                      </span>
                    )}
                    <Badge className={
                      label.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                      label.status === 'SOLD' ? 'bg-blue-500/20 text-blue-400' :
                      label.status === 'DEPLETED' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }>
                      {label.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
