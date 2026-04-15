'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CheckCircle2,
  ShoppingCart,
  Send,
  Package,
  Truck,
  Copy,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { UserPhaseResult } from '@/lib/user-phase'

interface Props {
  phaseData: UserPhaseResult
}

type StepState = 'completed' | 'active' | 'upcoming'

function StepRow({
  index,
  state,
  icon: Icon,
  title,
  children,
}: {
  index: number
  state: StepState
  icon: React.ElementType
  title: string
  children?: React.ReactNode
}) {
  const isActive = state === 'active'
  const isCompleted = state === 'completed'

  return (
    <div
      className={`flex items-start gap-4 rounded-lg border p-4 ${
        isActive
          ? 'border-primary bg-primary/5'
          : isCompleted
            ? 'border-border bg-muted/30'
            : 'border-dashed opacity-60'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : isCompleted
              ? 'bg-muted text-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium">
            {index}. {title}
          </p>
          {isCompleted && (
            <Badge variant="secondary" className="text-xs">
              Done
            </Badge>
          )}
        </div>
        {children && <div className="mt-2 space-y-2 text-sm">{children}</div>}
      </div>
    </div>
  )
}

function copyLink(url: string) {
  navigator.clipboard
    .writeText(url)
    .then(() => toast.success('Link copied'))
    .catch(() => toast.error('Could not copy'))
}

export function JourneyCard({ phaseData }: Props) {
  const { phase, latestOrder, pendingDispatches, firstPendingCargoId } = phaseData

  // Derive visual states for each of the 4 steps
  const steps: Array<{ state: StepState; index: number }> = [
    { index: 1, state: 'upcoming' },
    { index: 2, state: 'upcoming' },
    { index: 3, state: 'upcoming' },
    { index: 4, state: 'upcoming' },
  ]
  if (phase === 0) steps[0].state = 'active'
  if (phase === 1 || phase === '1b') {
    steps[0].state = 'completed'
    steps[1].state = 'active'
  }
  if (phase === 2) {
    steps[0].state = 'completed'
    steps[1].state = 'active'
  }
  if (phase === 3) {
    steps[0].state = 'completed'
    steps[1].state = 'completed'
    steps[2].state = 'active'
  }
  if (phase === 4) {
    steps[0].state = 'completed'
    steps[1].state = 'completed'
    steps[2].state = 'completed'
    steps[3].state = 'active'
  }

  const stepNames = ['Buy tracking labels', 'Dispatch labels', 'Receive labels and attach to cargo', 'Track cargo in real-time']
  const completedStepNames = steps
    .filter((s) => s.state === 'completed')
    .map((s) => stepNames[s.index - 1])

  const pendingReceiverDispatches = pendingDispatches.filter(
    (d) => d.status === 'PENDING' && !d.addressSubmittedAt,
  )
  const inTransitDispatches = pendingDispatches.filter(
    (d) => d.status === 'IN_TRANSIT' || (d.status === 'PENDING' && d.addressSubmittedAt),
  )
  const deliveredDispatches = pendingDispatches.filter((d) => d.status === 'DELIVERED')

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-6 text-center">
          <h3 className="text-lg font-semibold">Welcome! Here&apos;s how to get started</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow these steps to start tracking your cargo in real-time
          </p>
        </div>

        <div className="space-y-3">
          {/* Completed steps — collapsed into a compact summary */}
          {completedStepNames.length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex -space-x-1">
                {completedStepNames.map((_, i) => (
                  <div key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-foreground ring-2 ring-card">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {completedStepNames.join(', ')}
              </p>
              <Badge variant="secondary" className="ml-auto text-xs shrink-0">Done</Badge>
            </div>
          )}

          {/* Step 1 — Buy labels (only if not completed) */}
          {steps[0].state !== 'completed' && (
            <StepRow index={1} state={steps[0].state} icon={ShoppingCart} title="Buy tracking labels">
              {steps[0].state === 'active' && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-muted-foreground">
                    Order tracking labels — delivered to wherever you choose.
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/buy">Buy Labels</Link>
                  </Button>
                </div>
              )}
            </StepRow>
          )}

          {/* Step 2 — Dispatch labels (only if not completed) */}
          {steps[1].state !== 'completed' && (
            <StepRow
              index={2}
              state={steps[1].state}
              icon={Send}
              title="Dispatch labels"
            >
              {phase === 1 && latestOrder && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground">
                    Tell us where to ship your labels ({latestOrder.undispatchedCount} undispatched).
                    They&apos;ll arrive within 3-5 business days.
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/dispatch/new">
                      <Send className="mr-1.5 h-4 w-4" /> New Dispatch
                    </Link>
                  </Button>
                </div>
              )}

              {phase === '1b' && pendingReceiverDispatches.length > 0 && (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Waiting for the receiver to submit their delivery details.
                  </p>
                  {pendingReceiverDispatches.map((d) => {
                    const shareUrl = `${window.location.origin}/track/${d.shareCode}`
                    return (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3 text-xs"
                      >
                        <div>
                          <p className="font-medium">{d.name || 'Untitled dispatch'}</p>
                          <p className="text-muted-foreground">
                            {d.labelCount} label{d.labelCount === 1 ? '' : 's'} · Created{' '}
                            {formatDistanceToNow(d.createdAt, { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyLink(shareUrl)}
                            title="Copy share link"
                          >
                            <Copy className="mr-1 h-3 w-3" /> Copy
                          </Button>
                          <Button size="sm" variant="ghost" asChild>
                            <Link href={`/dispatch/${d.id}`}>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {phase === 2 && inTransitDispatches.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground">
                      Your labels are on the way — set up cargo tracking now so it&apos;s ready
                      the moment they arrive.
                    </p>
                    <Button size="sm" asChild>
                      <Link href="/cargo/new">
                        <Truck className="mr-1.5 h-4 w-4" /> Set Up Cargo Tracking
                      </Link>
                    </Button>
                  </div>
                  {inTransitDispatches.map((d) => (
                    <Link
                      key={d.id}
                      href={`/dispatch/${d.id}`}
                      className="flex items-center justify-between rounded-md border bg-background p-3 text-xs hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{d.name || 'Untitled dispatch'}</p>
                        <p className="text-muted-foreground">
                          {d.status === 'IN_TRANSIT' ? 'In transit' : 'Ready to ship'} · {d.labelCount}{' '}
                          label{d.labelCount === 1 ? '' : 's'}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}

              {phase === 3 && deliveredDispatches.length > 0 && (
                <p className="text-muted-foreground">
                  Labels delivered. {deliveredDispatches[0].name || 'Your dispatch'} arrived{' '}
                  {deliveredDispatches[0].addressSubmittedAt
                    ? formatDistanceToNow(deliveredDispatches[0].createdAt, { addSuffix: true })
                    : 'recently'}
                  .
                </p>
              )}
            </StepRow>
          )}

          {/* Step 3 — Receive + attach (only if not completed) */}
          {steps[2].state !== 'completed' && (
            <StepRow
              index={3}
              state={steps[2].state}
              icon={Package}
              title="Receive labels and attach to cargo"
            >
              {phase === 3 && (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground">
                    Remove the pull tab to activate a label, then stick it on the cargo you&apos;re
                    shipping.
                  </p>
                  <Button size="sm" asChild>
                    <Link href="/cargo/new">
                      <Truck className="mr-1.5 h-4 w-4" /> Track Cargo
                    </Link>
                  </Button>
                </div>
              )}
            </StepRow>
          )}

          {/* Step 4 — Track cargo */}
          <StepRow index={4} state={steps[3].state} icon={Truck} title="Track cargo in real-time">
            {phase === 4 && firstPendingCargoId && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-muted-foreground">
                  Your cargo shipment is waiting for its first location signal.
                </p>
                <Button size="sm" asChild>
                  <Link href={`/cargo/${firstPendingCargoId}`}>
                    View Shipment <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
            {steps[3].state === 'upcoming' && (
              <p className="text-muted-foreground">
                Share a public tracking link with the receiver. Auto-delivery when the cargo
                arrives.
              </p>
            )}
          </StepRow>
        </div>
      </CardContent>
    </Card>
  )
}
