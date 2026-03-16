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
  PENDING: 'bg-gray-500/20 text-muted-foreground',
  PAID: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  SHIPPED: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  DELIVERED: 'bg-green-500/20 text-green-600 dark:text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params

  const order = await db.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      orderLabels: {
        include: {
          label: {
            select: {
              id: true,
              deviceId: true,
              status: true,
              batteryPct: true,
              activatedAt: true,
            },
          },
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
      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
        <Link href="/admin/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Order {order.id.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.createdAt), 'PPPp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusStyles[order.status]}>{order.status}</Badge>
          {order.status === 'PAID' && <MarkShippedButton orderId={order.id} />}
        </div>
      </div>

      {/* Customer */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <User className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-card-foreground">Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-card-foreground">{order.user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground">
              {[order.user.firstName, order.user.lastName].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Payment */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-card-foreground">Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quantity</span>
            <span className="text-card-foreground">{order.quantity} label{order.quantity > 1 ? 's' : ''}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Unit price</span>
            <span className="text-foreground">
              {currencySymbol}{(order.totalAmount / order.quantity / 100).toFixed(2)}
            </span>
          </div>
          <Separator className="bg-border" />
          <div className="flex justify-between font-semibold">
            <span className="text-muted-foreground">Total</span>
            <span className="text-card-foreground">
              {currencySymbol}{(order.totalAmount / 100).toFixed(2)} {order.currency}
            </span>
          </div>
          {order.stripePaymentId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stripe Payment</span>
              <span className="font-mono text-xs text-muted-foreground">{order.stripePaymentId}</span>
            </div>
          )}
          {order.stripeSessionId && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stripe Session</span>
              <span className="font-mono text-xs text-muted-foreground">{order.stripeSessionId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <Truck className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-card-foreground">Shipping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {shippingAddress ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">Delivery address</p>
              <div className="flex items-start gap-2 text-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
            <p className="text-muted-foreground">No shipping address on file</p>
          )}

          {order.shippedAt && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipped on</span>
              <span className="text-foreground">{format(new Date(order.shippedAt), 'PPPp')}</span>
            </div>
          )}
          {order.trackingNumber && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tracking</span>
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
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-card-foreground">
            Labels ({order.orderLabels.length}/{order.quantity})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {order.orderLabels.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No labels assigned to this order yet
            </p>
          ) : (
            <div className="space-y-2">
              {order.orderLabels.map((ol) => (
                <div
                  key={ol.label.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm text-card-foreground">{ol.label.deviceId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {ol.label.batteryPct !== null && (
                      <span className={`text-xs ${ol.label.batteryPct < 20 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {ol.label.batteryPct}%
                      </span>
                    )}
                    <Badge className={
                      ol.label.status === 'ACTIVE' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      ol.label.status === 'SOLD' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                      ol.label.status === 'DEPLETED' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                      'bg-gray-500/20 text-muted-foreground'
                    }>
                      {ol.label.status}
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
