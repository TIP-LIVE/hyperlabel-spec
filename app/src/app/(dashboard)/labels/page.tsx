import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, Battery, Plus, ShoppingCart } from 'lucide-react'
import { db } from '@/lib/db'
import { getCurrentUser, canViewAllOrgData } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { formatDistanceToNow } from 'date-fns'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Labels',
  description: 'Your tracking labels — device IDs, battery, and status',
}

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  INVENTORY: 'secondary',
  SOLD: 'outline',
  ACTIVE: 'default',
  DEPLETED: 'destructive',
}

export default async function LabelsPage() {
  const user = await getCurrentUser()
  let orgId: string | null = null
  let orgRole: string | null = null

  try {
    const authResult = await auth()
    orgId = authResult.orgId ?? null
    orgRole = authResult.orgRole ?? null
  } catch {
    redirect('/sign-in')
  }

  const orderFilter: Record<string, unknown> = {}
  if (orgId) {
    orderFilter.orgId = orgId
    if (!canViewAllOrgData(orgRole ?? 'org:member')) {
      orderFilter.userId = user?.id
    }
  } else if (user) {
    orderFilter.userId = user.id
  }

  const labels = user
    ? await db.label.findMany({
        where: {
          orderLabels: {
            some: {
              order: {
                ...orderFilter,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
              },
            },
          },
        },
        select: {
          id: true,
          deviceId: true,
          status: true,
          batteryPct: true,
          activatedAt: true,
        },
        orderBy: { deviceId: 'asc' },
      })
    : []

  const newShipmentAction = (
    <Button asChild>
      <Link href="/shipments/new">
        <Plus className="mr-2 h-4 w-4" />
        New Shipment
      </Link>
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Labels"
        description="Your tracking labels — device IDs, battery, and status"
        action={newShipmentAction}
      />

      {labels.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Package}
              title="No labels yet"
              description="Labels you own will appear here. Buy labels or add existing ones to this organisation."
              action={
                <>
                  <Button asChild>
                    <Link href="/buy">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Buy Labels
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                </>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{`Your labels (${labels.length})`}</CardTitle>
            <CardDescription>Device ID, status, and battery. Use a label when creating a shipment.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {labels.map((label) => (
                <li key={label.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-mono font-medium">{label.deviceId}</p>
                      {label.activatedAt && (
                        <p className="text-xs text-muted-foreground">
                          Activated {formatDistanceToNow(new Date(label.activatedAt), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {label.batteryPct != null && (
                      <span
                        className={`flex items-center gap-1 text-sm ${
                          label.batteryPct < 20 ? 'text-destructive font-medium' : 'text-muted-foreground'
                        }`}
                      >
                        <Battery className="h-4 w-4" />
                        {label.batteryPct}%
                      </span>
                    )}
                    <Badge variant={statusVariants[label.status] ?? 'outline'}>{label.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
