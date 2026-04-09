import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Package, Plus, Send, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { DispatchList } from '@/components/dispatch/dispatch-list'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Label Dispatch',
  description: 'Ship and track label dispatches',
}

interface DispatchPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function DispatchPage({ searchParams }: DispatchPageProps) {
  const { status: initialStatus } = await searchParams
  const user = await getCurrentUser()
  const { orgId } = await auth()

  const where: Record<string, unknown> = { type: 'LABEL_DISPATCH' }
  if (orgId) {
    where.orgId = orgId
  } else if (user) {
    where.userId = user.id
  }

  let shipmentCount = 0
  let warehouseLabelCount = 0
  if (user) {
    // Count labels sitting in our warehouse for this org: bought (SOLD/INVENTORY),
    // part of a completed order, and not already in an active dispatch.
    // Mirrors the filter in /api/v1/orders/available-labels.
    const orderScope = orgId ? { orgId } : { userId: user.id }
    const [shipments, labels] = await Promise.all([
      db.shipment.count({ where }),
      db.label.count({
        where: {
          status: { in: ['SOLD', 'INVENTORY'] },
          orderLabels: {
            some: {
              order: {
                ...orderScope,
                status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
              },
            },
          },
          shipmentLabels: {
            none: {
              shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } },
            },
          },
        },
      }),
    ])
    shipmentCount = shipments
    warehouseLabelCount = labels
  }

  const showEmptyState = shipmentCount === 0 && isClerkConfigured()
  const hasLabelsReady = warehouseLabelCount > 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Label Dispatch"
        description="We'll ship your purchased labels from our warehouse to any address you choose"
        action={
          <>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/labels">All labels</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">Order history</Link>
            </Button>
            <Button asChild>
              <Link href="/dispatch/new">
                <Plus className="mr-2 h-4 w-4" />
                New Dispatch
              </Link>
            </Button>
          </>
        }
      />

      {showEmptyState ? (
        hasLabelsReady ? (
          <EmptyState
            icon={Send}
            title={`${warehouseLabelCount} ${warehouseLabelCount === 1 ? 'label is' : 'labels are'} ready to ship`}
            description="Your labels are waiting in our warehouse. Tell us where to send them and we'll dispatch them to any address you choose."
            action={
              <Button asChild>
                <Link href="/dispatch/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Dispatch
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Send}
            title="No dispatches yet"
            description="Tell us where to send your labels. Buy labels first, then create a dispatch with the destination details."
            action={
              <>
                <Button variant="outline" asChild>
                  <Link href="/buy">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Labels
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/dispatch/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Dispatch
                  </Link>
                </Button>
              </>
            }
          />
        )
      ) : (
        <>
          {user && (
            <div
              className={
                hasLabelsReady
                  ? 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3'
                  : 'flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3'
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    hasLabelsReady
                      ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10'
                      : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted'
                  }
                >
                  <Package
                    className={
                      hasLabelsReady ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-muted-foreground'
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {hasLabelsReady
                      ? `${warehouseLabelCount} ${warehouseLabelCount === 1 ? 'label' : 'labels'} in your warehouse ready to dispatch`
                      : 'No labels in your warehouse'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasLabelsReady
                      ? "Tell us where to send them and we'll ship them from our warehouse."
                      : 'All your purchased labels are already in an active dispatch. Buy more to dispatch a new batch.'}
                  </p>
                </div>
              </div>
              {hasLabelsReady ? (
                <Button size="sm" asChild>
                  <Link href="/dispatch/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Dispatch
                  </Link>
                </Button>
              ) : (
                <Button size="sm" variant="outline" asChild>
                  <Link href="/buy">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Buy Labels
                  </Link>
                </Button>
              )}
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Label Dispatches</CardTitle>
              <CardDescription>See where your labels are on their way from our warehouse to their destination</CardDescription>
            </CardHeader>
            <CardContent>
              <DispatchList initialStatus={initialStatus} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
