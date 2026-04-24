import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Package, MapPin, Truck, CreditCard, User, Send } from 'lucide-react'
import { CreateDispatchButton } from '@/components/admin/create-dispatch-button'
import { MarkPaidButton } from '@/components/admin/mark-paid-button'
import { CancelOrderButton } from '@/components/admin/cancel-order-button'
import { shipmentStatusStyles } from '@/lib/status-config'
import { format } from 'date-fns'
import { formatDateTime } from '@/lib/utils/format-date'
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
              displayId: true,
              status: true,
              batteryPct: true,
              activatedAt: true,
              shipmentLabels: {
                include: {
                  shipment: {
                    select: { id: true, name: true, status: true, shareCode: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!order) notFound()

  // Build label info with dispatch status
  const labelsWithDispatch = order.orderLabels.map((ol) => {
    const activeDispatch = ol.label.shipmentLabels.find(
      (sl) => sl.shipment.status === 'PENDING' || sl.shipment.status === 'IN_TRANSIT'
    )
    const deliveredDispatch = ol.label.shipmentLabels.find(
      (sl) => sl.shipment.status === 'DELIVERED'
    )
    const dispatch = activeDispatch || deliveredDispatch
    return {
      id: ol.label.id,
      deviceId: ol.label.deviceId,
      displayId: ol.label.displayId,
      status: ol.label.status,
      batteryPct: ol.label.batteryPct,
      activatedAt: ol.label.activatedAt,
      inActiveDispatch: !!activeDispatch,
      dispatchStatus: dispatch?.shipment.status,
      dispatchName: dispatch?.shipment.name,
      dispatchShareCode: dispatch?.shipment.shareCode,
    }
  })

  // Get all dispatches for this order (new: via orderId, legacy: via ShipmentLabel)
  const orderLabelIds = order.orderLabels.map((ol) => ol.label.id)

  // Dispatches linked directly via orderId
  const directDispatches = await db.shipment.findMany({
    where: { orderId: order.id, type: 'LABEL_DISPATCH' },
    select: {
      id: true, name: true, status: true, shareCode: true, createdAt: true, labelCount: true,
      _count: { select: { shipmentLabels: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Legacy dispatches via ShipmentLabel (for backwards compat)
  let legacyDispatches: typeof directDispatches = []
  if (orderLabelIds.length > 0) {
    const shipmentLabels = await db.shipmentLabel.findMany({
      where: { labelId: { in: orderLabelIds } },
      select: { shipmentId: true },
    })
    const directIds = new Set(directDispatches.map((d) => d.id))
    const legacyIds = [...new Set(shipmentLabels.map((sl) => sl.shipmentId))].filter((sid) => !directIds.has(sid))

    if (legacyIds.length > 0) {
      legacyDispatches = await db.shipment.findMany({
        where: { id: { in: legacyIds }, type: 'LABEL_DISPATCH' },
        select: {
          id: true, name: true, status: true, shareCode: true, createdAt: true, labelCount: true,
          _count: { select: { shipmentLabels: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }
  }

  const dispatches = [...directDispatches, ...legacyDispatches]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const shippingAddress = order.shippingAddress as {
    line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string
  } | null

  const currencySymbol = order.currency === 'GBP' ? '\u00a3' : order.currency === 'EUR' ? '\u20ac' : '$'
  const orderShortId = order.id.slice(-8).toUpperCase()

  const undispatchedLabelCount = labelsWithDispatch.filter(
    (l) => !l.inActiveDispatch && !l.dispatchStatus && (l.status === 'SOLD' || l.status === 'INVENTORY')
  ).length

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
            Order {orderShortId}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.createdAt), 'PPPp')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusStyles[order.status]}>{order.status}</Badge>
          {order.status === 'PENDING' && (
            <MarkPaidButton
              orderId={order.id}
              orderShortId={orderShortId}
              quantity={order.quantity}
            />
          )}
          {(order.status === 'PAID' || order.status === 'SHIPPED') && undispatchedLabelCount > 0 && (
            <CreateDispatchButton
              orderId={order.id}
              orderShortId={orderShortId}
              availableLabelCount={undispatchedLabelCount}
            />
          )}
          {order.source === 'INVOICE' && order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <CancelOrderButton
              orderId={order.id}
              orderShortId={orderShortId}
              assignedLabelCount={order.orderLabels.length}
            />
          )}
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

      {/* Delivery Address */}
      {shippingAddress && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-card-foreground">Delivery Address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex items-start gap-2 text-foreground">
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
          </CardContent>
        </Card>
      )}

      {/* Dispatches */}
      {dispatches.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center gap-2">
            <Send className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-card-foreground">Dispatches ({dispatches.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dispatches.map((d) => (
                <Link
                  key={d.id}
                  href={`/admin/dispatch?q=${d.shareCode}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm text-card-foreground">{d.name || 'Unnamed dispatch'}</span>
                      <p className="text-xs text-muted-foreground">
                        {d._count.shipmentLabels > 0
                          ? `${d._count.shipmentLabels} label${d._count.shipmentLabels !== 1 ? 's' : ''} linked`
                          : d.labelCount
                            ? `${d.labelCount} label${d.labelCount !== 1 ? 's' : ''} (not yet linked)`
                            : 'No labels'
                        } · {formatDateTime(d.createdAt)}
                      </p>
                    </div>
                  </div>
                  <Badge className={shipmentStatusStyles[d.status as keyof typeof shipmentStatusStyles]}>
                    {d.status === 'IN_TRANSIT' ? 'In Transit' : d.status.charAt(0) + d.status.slice(1).toLowerCase()}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {labelsWithDispatch.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm text-card-foreground">{label.deviceId}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {label.batteryPct !== null && (
                      <span className={`text-xs ${label.batteryPct < 20 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {label.batteryPct}%
                      </span>
                    )}
                    <Badge className={
                      label.status === 'ACTIVE' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                      label.status === 'SOLD' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                      label.status === 'DEPLETED' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                      'bg-gray-500/20 text-muted-foreground'
                    }>
                      {label.status}
                    </Badge>
                    {label.dispatchStatus && (
                      <Badge variant="outline" className="text-xs">
                        {label.dispatchStatus === 'PENDING' ? 'In dispatch' :
                         label.dispatchStatus === 'IN_TRANSIT' ? 'In Transit' :
                         label.dispatchStatus === 'DELIVERED' ? 'Delivered' :
                         label.dispatchStatus}
                      </Badge>
                    )}
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
