import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ArrowLeft, Package, ShieldAlert, User } from 'lucide-react'
import { DispatchDetailClient } from '@/components/dispatch/dispatch-detail-client'
import { DispatchAdminActions } from '@/components/dispatch/dispatch-admin-actions'
import { shipmentStatusStyles } from '@/lib/status-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const shipment = await db.shipment.findUnique({
    where: { id },
    select: { name: true },
  })

  return {
    title: shipment?.name ? `${shipment.name} (Admin)` : 'Dispatch (Admin)',
    description: 'Admin view of label dispatch',
  }
}

export default async function AdminDispatchDetailPage({ params }: PageProps) {
  const { id } = await params

  const shipment = await db.shipment.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      shipmentLabels: {
        include: {
          label: {
            select: {
              id: true,
              deviceId: true,
              displayId: true,
              iccid: true,
              batteryPct: true,
              status: true,
              firmwareVersion: true,
              activatedAt: true,
              lastSeenAt: true,
            },
          },
        },
      },
      locations: {
        where: { source: 'CELL_TOWER' },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      },
    },
  })

  if (!shipment || shipment.type !== 'LABEL_DISPATCH') {
    notFound()
  }

  const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/track/${shipment.shareCode}`

  const ownerName = [shipment.user.firstName, shipment.user.lastName].filter(Boolean).join(' ')

  const serializedData = {
    id: shipment.id,
    name: shipment.name,
    status: shipment.status,
    originAddress: shipment.originAddress,
    originLat: shipment.originLat,
    originLng: shipment.originLng,
    destinationAddress: shipment.destinationAddress,
    destinationLat: shipment.destinationLat,
    destinationLng: shipment.destinationLng,
    destinationLine1: shipment.destinationLine1,
    destinationLine2: shipment.destinationLine2,
    destinationCity: shipment.destinationCity,
    destinationState: shipment.destinationState,
    destinationPostalCode: shipment.destinationPostalCode,
    destinationCountry: shipment.destinationCountry,
    receiverFirstName: shipment.receiverFirstName,
    receiverLastName: shipment.receiverLastName,
    consigneeEmail: shipment.consigneeEmail,
    consigneePhone: shipment.consigneePhone,
    deliveredAt: shipment.deliveredAt?.toISOString() ?? null,
    createdAt: shipment.createdAt.toISOString(),
    shareCode: shipment.shareCode,
    shipmentLabels: shipment.shipmentLabels.map((sl) => ({
      deviceId: sl.label.deviceId,
      displayId: sl.label.displayId,
      iccid: sl.label.iccid,
      batteryPct: sl.label.batteryPct,
      status: sl.label.status,
      firmwareVersion: sl.label.firmwareVersion,
      activatedAt: sl.label.activatedAt?.toISOString() ?? null,
      lastSeenAt: sl.label.lastSeenAt?.toISOString() ?? null,
    })),
    locations: shipment.locations.map((loc) => ({
      id: loc.id,
      latitude: loc.latitude,
      longitude: loc.longitude,
      recordedAt: loc.recordedAt.toISOString(),
      receivedAt: loc.receivedAt.toISOString(),
      batteryPct: loc.batteryPct,
      accuracyM: loc.accuracyM,
      isOfflineSync: loc.isOfflineSync,
      geocodedCity: loc.geocodedCity,
      geocodedArea: loc.geocodedArea,
      geocodedCountry: loc.geocodedCountry,
      geocodedCountryCode: loc.geocodedCountryCode,
    })),
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" asChild>
        <Link href="/admin/dispatch">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dispatches
        </Link>
      </Button>

      {/* Admin Actions Panel — visually distinct from the customer view */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Admin Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {shipment.status === 'PENDING' && !shipment.destinationAddress && (
            <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-foreground">Receiver address not submitted yet</p>
                <p className="text-muted-foreground">
                  The receiver hasn&apos;t filled in their delivery details via the share link.{' '}
                  <span className="text-foreground">Scan &amp; Ship</span> is disabled until there&apos;s an
                  address to ship to — either wait for the receiver, or use Edit below to fill the address in
                  yourself.
                </p>
              </div>
            </div>
          )}
          {shipment.status === 'PENDING' && shipment.shipmentLabels.length === 0 && shipment.labelCount && (
            <div className="flex items-start gap-2 rounded-md border border-blue-500/40 bg-blue-500/10 p-3 text-sm">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-foreground">
                  {shipment.labelCount} label{shipment.labelCount !== 1 ? 's' : ''} to link
                </p>
                <p className="text-muted-foreground">
                  No labels linked yet. Click <span className="text-foreground">Scan &amp; Ship</span> to scan
                  physical labels and link them to this dispatch before shipping.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Owner:</span>
              <Link
                href={`/admin/users?q=${encodeURIComponent(shipment.user.email)}`}
                className="font-medium text-foreground hover:underline"
              >
                {ownerName || shipment.user.email}
              </Link>
              {ownerName && (
                <span className="text-xs text-muted-foreground">({shipment.user.email})</span>
              )}
              <Badge className={shipmentStatusStyles[shipment.status as keyof typeof shipmentStatusStyles] || ''}>
                {shipment.status}
              </Badge>
            </div>
            <DispatchAdminActions
              shipmentId={shipment.id}
              shipmentName={shipment.name}
              status={shipment.status}
              destinationAddress={shipment.destinationAddress}
              labelCount={shipment.labelCount}
              consigneeEmail={shipment.consigneeEmail}
              shareCode={shipment.shareCode}
            />
          </div>
        </CardContent>
      </Card>

      {/* The customer view, rendered as-is */}
      <DispatchDetailClient
        initialData={serializedData}
        trackingUrl={trackingUrl}
        backHref="/admin/dispatch"
      />
    </div>
  )
}
