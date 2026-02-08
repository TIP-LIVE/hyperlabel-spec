import { redirect } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, Truck, Clock, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ deviceId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { deviceId } = await params
  return {
    title: `Label ${deviceId.toUpperCase()} - TIP`,
    description: 'Track your shipment with TIP door-to-door cargo tracking',
  }
}

export default async function ActivateLabelPage({ params }: PageProps) {
  const { deviceId: rawDeviceId } = await params
  const deviceId = decodeURIComponent(rawDeviceId).toUpperCase()

  // Validate device ID format
  if (!/^HL-\d{6}$/.test(deviceId)) {
    return (
      <ActivateLayout>
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invalid Label</CardTitle>
            <CardDescription>
              &ldquo;{deviceId}&rdquo; is not a valid TIP tracking label ID.
              Valid IDs look like <span className="font-mono">HL-001234</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">Go to TIP</Link>
            </Button>
          </CardContent>
        </Card>
      </ActivateLayout>
    )
  }

  // Look up the label
  const label = await db.label.findUnique({
    where: { deviceId },
    include: {
      shipments: {
        where: {
          shareEnabled: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          shareCode: true,
          status: true,
        },
      },
    },
  })

  // Label not found in our system
  if (!label) {
    return (
      <ActivateLayout>
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <CardTitle className="mt-4">Label Not Found</CardTitle>
            <CardDescription>
              We couldn&apos;t find label <span className="font-mono font-medium">{deviceId}</span> in our system.
              It may not have been registered yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <p className="text-center text-sm text-muted-foreground">
              If you purchased this label, contact us for help.
            </p>
            <Button asChild>
              <Link href="/">Go to TIP</Link>
            </Button>
          </CardContent>
        </Card>
      </ActivateLayout>
    )
  }

  // Label has an active shipment with sharing enabled — redirect to tracking
  const activeShipment = label.shipments[0]
  if (activeShipment && (activeShipment.status === 'PENDING' || activeShipment.status === 'IN_TRANSIT' || activeShipment.status === 'DELIVERED')) {
    redirect(`/track/${activeShipment.shareCode}`)
  }

  // Label exists but no active/trackable shipment
  const statusMessages: Record<string, { icon: React.ReactNode; title: string; description: string }> = {
    INVENTORY: {
      icon: <Package className="mx-auto h-12 w-12 text-muted-foreground" />,
      title: 'Label Not Yet Activated',
      description: 'This label hasn\'t been assigned to a shipment yet. The shipper will activate it when your cargo is ready to ship.',
    },
    SOLD: {
      icon: <Clock className="mx-auto h-12 w-12 text-muted-foreground" />,
      title: 'Waiting for Shipment',
      description: 'This label has been purchased but isn\'t tracking a shipment yet. The shipper will set it up when your cargo is on its way.',
    },
    ACTIVE: {
      icon: <Truck className="mx-auto h-12 w-12 text-primary" />,
      title: 'Label is Active',
      description: 'This label is active but doesn\'t have a publicly shared shipment right now. Ask the shipper for a tracking link.',
    },
    DEPLETED: {
      icon: <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />,
      title: 'Label Battery Depleted',
      description: 'This label\'s battery has run out. If it was tracking a shipment, ask the shipper for the delivery status.',
    },
  }

  // If there's a cancelled shipment or the shipment has sharing disabled
  const hasShipmentButNoAccess = activeShipment && activeShipment.status === 'CANCELLED'
  const info = hasShipmentButNoAccess
    ? {
        icon: <Package className="mx-auto h-12 w-12 text-muted-foreground" />,
        title: 'Shipment Cancelled',
        description: 'The shipment associated with this label has been cancelled.',
      }
    : statusMessages[label.status] || statusMessages.INVENTORY

  return (
    <ActivateLayout>
      <Card className="max-w-md">
        <CardHeader className="text-center">
          {info.icon}
          <CardTitle className="mt-4">{info.title}</CardTitle>
          <CardDescription className="mt-1">
            Label <span className="font-mono font-medium">{deviceId}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <p className="text-center text-sm text-muted-foreground">
            {info.description}
          </p>
          <Button asChild>
            <Link href="/">Go to TIP</Link>
          </Button>
        </CardContent>
      </Card>
    </ActivateLayout>
  )
}

function ActivateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
      {children}
      <p className="mt-6 text-xs text-muted-foreground">
        Powered by{' '}
        <Link href="/" className="font-medium text-primary hover:underline">
          TIP
        </Link>{' '}
        &mdash; door-to-door cargo tracking
      </p>
    </div>
  )
}
