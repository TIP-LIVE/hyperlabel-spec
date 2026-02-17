import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, MapPin, Truck, Receipt } from 'lucide-react'
import { format } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const order = await db.order.findUnique({
    where: { id },
    select: { quantity: true },
  })

  return {
    title: order ? `Order - ${order.quantity} Label${order.quantity > 1 ? 's' : ''}` : 'Order Details',
    description: 'View order details and invoice',
  }
}

const statusConfig = {
  PENDING: { label: 'Pending', variant: 'secondary' as const },
  PAID: { label: 'Paid', variant: 'default' as const },
  SHIPPED: { label: 'Shipped', variant: 'default' as const },
  DELIVERED: { label: 'Delivered', variant: 'outline' as const },
  CANCELLED: { label: 'Cancelled', variant: 'destructive' as const },
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user && isClerkConfigured()) {
    redirect('/sign-in')
  }

  const order = await db.order.findUnique({
    where: { id },
    include: {
      orderLabels: {
        include: {
          label: {
            select: { id: true, deviceId: true, status: true },
          },
        },
      },
    },
  })

  if (!order) {
    notFound()
  }

  // Check access: org membership + ownership
  const { orgId, orgRole } = await auth()
  if (user && user.role !== 'admin') {
    // B2B: only same-org can view
    if (order.orgId && order.orgId !== orgId) {
      notFound()
    }
  }

  const status = statusConfig[order.status]
  const shippingAddress = order.shippingAddress as {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
  } | null

  const unitPrice = order.totalAmount / order.quantity
  const currencySymbol = order.currency === 'GBP' ? '\u00a3' : order.currency === 'EUR' ? '\u20ac' : '$'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Link>
      </Button>

      {/* Order Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Order Details</h1>
          <p className="text-sm text-muted-foreground">
            Placed on {format(new Date(order.createdAt), 'PPP')}
          </p>
        </div>
        <Badge variant={status.variant} className="text-sm">
          {status.label}
        </Badge>
      </div>

      {/* Invoice Card */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order ID */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs">{order.id}</span>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>
                HyperLabel Tracking Label x{order.quantity}
              </span>
              <span>
                {currencySymbol}{(order.totalAmount / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Unit price</span>
              <span>
                {currencySymbol}{(unitPrice / 100).toFixed(2)} each
              </span>
            </div>
          </div>

          <Separator />

          {/* Total */}
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>
              {currencySymbol}{(order.totalAmount / 100).toFixed(2)} {order.currency}
            </span>
          </div>

          {order.stripePaymentId && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Payment ref</span>
              <span className="font-mono">{order.stripePaymentId}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipping Card */}
      {(shippingAddress || order.trackingNumber || order.shippedAt) && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Truck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Shipping</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shippingAddress && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Delivery address</p>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
            )}

            {order.shippedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipped on</span>
                <span>{format(new Date(order.shippedAt), 'PPP')}</span>
              </div>
            )}

            {order.trackingNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tracking number</span>
                <a
                  href={`https://track.aftership.com/${order.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-mono text-xs text-primary hover:underline"
                >
                  <Truck className="h-3 w-3" />
                  {order.trackingNumber}
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Labels Card */}
      {order.orderLabels.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle>
              Labels ({order.orderLabels.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {order.orderLabels.map((ol) => (
                <div
                  key={ol.label.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">{ol.label.deviceId}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {ol.label.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
