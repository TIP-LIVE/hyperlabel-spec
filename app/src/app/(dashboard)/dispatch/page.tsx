import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Plus, Send, ShoppingCart } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { DispatchList } from '@/components/dispatch/dispatch-list'
import { isClerkConfigured } from '@/lib/clerk-config'
import { resolveUserPhase } from '@/lib/user-phase'
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
  let undispatchedCount = 0
  if (user) {
    shipmentCount = await db.shipment.count({ where })
    if (shipmentCount === 0) {
      const phase = await resolveUserPhase({ userId: user.id, orgId: orgId ?? null })
      undispatchedCount = phase.latestOrder?.undispatchedCount ?? 0
    }
  }

  const showEmptyState = shipmentCount === 0 && isClerkConfigured()
  const hasLabelsReady = undispatchedCount > 0

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
            title={`${undispatchedCount} ${undispatchedCount === 1 ? 'label is' : 'labels are'} ready to ship`}
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
        <Card>
          <CardHeader>
            <CardTitle>Label Dispatches</CardTitle>
            <CardDescription>See where your labels are on their way from our warehouse to their destination</CardDescription>
          </CardHeader>
          <CardContent>
            <DispatchList initialStatus={initialStatus} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
