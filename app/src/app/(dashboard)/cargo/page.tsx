import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowRight, Plus, Send, ShoppingCart, Truck } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { CargoList } from '@/components/cargo/cargo-list'
import { getCurrentUser } from '@/lib/auth'
import { resolveUserPhase, type UserPhaseResult } from '@/lib/user-phase'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Track Cargo',
  description: 'Track and manage your cargo shipments',
}

interface CargoPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function CargoPage({ searchParams }: CargoPageProps) {
  const { status: initialStatus } = await searchParams

  // Resolve journey phase so we can show phase-aware guidance before the user
  // physically has labels in hand. Labels live at TIP's warehouse until a
  // Label Dispatch is delivered — creating cargo shipments before then would
  // orphan the label, so we steer phase 0/1/1b/2 users back to step 2.
  const user = await getCurrentUser()
  let orgId: string | null = null
  try {
    const authResult = await auth()
    orgId = authResult.orgId ?? null
  } catch {
    // Unauthenticated — proxy middleware will redirect; fall through.
  }
  const phaseData = user
    ? await resolveUserPhase({ userId: user.id, orgId }).catch(() => null)
    : null

  // Phases 0 / 1 / 1b: labels genuinely aren't available yet — no cargo CTA.
  // Phase 2 (dispatch in transit): user can pre-create cargo, so they get the
  // CTA in the header AND a phase-aware empty state explaining the pre-create.
  const isPreCargoPhase =
    phaseData != null &&
    (phaseData.phase === 0 ||
      phaseData.phase === 1 ||
      phaseData.phase === '1b' ||
      phaseData.phase === 2)
  const canCreateCargo = phaseData == null || !(phaseData.phase === 0 || phaseData.phase === 1 || phaseData.phase === '1b')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Track Cargo"
        description={
          isPreCargoPhase
            ? 'Track cargo once your labels arrive at the receiver'
            : 'Attach tracking labels to your cargo and monitor journeys in real time'
        }
        action={
          canCreateCargo ? (
            <Button asChild>
              <Link href="/cargo/new">
                <Plus className="mr-2 h-4 w-4" />
                New Cargo Shipment
              </Link>
            </Button>
          ) : null
        }
      />

      {isPreCargoPhase && phaseData ? (
        <PreCargoEmptyState phaseData={phaseData} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Cargo Shipments</CardTitle>
            <CardDescription>Track your cargo with real-time location updates</CardDescription>
          </CardHeader>
          <CardContent>
            <CargoList initialStatus={initialStatus} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PreCargoEmptyState({ phaseData }: { phaseData: UserPhaseResult }) {
  const { phase, latestOrder, pendingDispatches } = phaseData

  const pendingReceiverDispatch = pendingDispatches.find(
    (d) => d.status === 'PENDING' && !d.addressSubmittedAt,
  )
  const inTransitDispatch = pendingDispatches.find(
    (d) => d.status === 'IN_TRANSIT' || (d.status === 'PENDING' && d.addressSubmittedAt),
  )

  let Icon = Send
  let title = 'Your labels are still at our warehouse'
  let description =
    "Tracking labels live at TIP's warehouse until you dispatch them. Once your labels arrive at the receiver, you can attach them to cargo and start tracking shipments here."
  let primary: { label: string; href: string; icon: React.ElementType } = {
    label: 'Dispatch Labels',
    href: '/dispatch/new',
    icon: Send,
  }
  let secondary: { label: string; href: string } | null = {
    label: 'Go to Dashboard',
    href: '/dashboard',
  }

  if (phase === 0 || !latestOrder) {
    Icon = ShoppingCart
    title = 'Buy labels to get started'
    description =
      "You don't have any tracking labels yet. Order your first batch and we'll ship them to wherever you need."
    primary = { label: 'Buy Labels', href: '/buy', icon: ShoppingCart }
  } else if (phase === 1) {
    const count = latestOrder.undispatchedCount
    Icon = Send
    title = 'Your labels are still at our warehouse'
    description = `You have ${count} label${count === 1 ? '' : 's'} waiting to be dispatched. Tell us where to ship them — once they arrive, you can attach them to cargo and start tracking here.`
    primary = { label: 'Dispatch Labels', href: '/dispatch/new', icon: Send }
  } else if (phase === '1b') {
    Icon = Send
    title = 'Waiting for receiver details'
    description =
      "Your dispatch is ready, but the receiver still needs to submit their delivery address. Share the link with them, or add the address yourself from the dispatch page."
    primary = pendingReceiverDispatch
      ? { label: 'Open Dispatch', href: `/dispatch/${pendingReceiverDispatch.id}`, icon: ArrowRight }
      : { label: 'New Dispatch', href: '/dispatch/new', icon: Send }
  } else if (phase === 2) {
    Icon = Truck
    title = 'Your labels are on their way — set up cargo tracking now'
    description =
      "Pre-configure a cargo shipment and it'll start tracking automatically once your label reaches the receiver and gets attached."
    primary = { label: 'Create Cargo Tracking', href: '/cargo/new', icon: Plus }
    secondary = inTransitDispatch
      ? { label: 'View Dispatch', href: `/dispatch/${inTransitDispatch.id}` }
      : { label: 'View Dispatches', href: '/dispatch' }
  }

  const PrimaryIcon = primary.icon

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-5 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-8 w-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild>
            <Link href={primary.href}>
              <PrimaryIcon className="mr-2 h-4 w-4" />
              {primary.label}
            </Link>
          </Button>
          {secondary && (
            <Button variant="outline" asChild>
              <Link href={secondary.href}>{secondary.label}</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
