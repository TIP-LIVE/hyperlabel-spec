import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ComparisonTable } from '@/components/landing/comparison-table'
import { Wifi, DollarSign, PackageCheck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP vs Traditional Tracking Solutions | Compare',
  description:
    'Compare TIP disposable tracking labels against RFID, Bluetooth, and enterprise GPS trackers. No scanners, no subscriptions, no return logistics.',
}

export default function ComparePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-black py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-headline text-4xl text-white md:text-5xl lg:text-6xl">
            TIP vs. Traditional Tracking
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-body-brand text-gray-400 md:text-lg">
            See how a $20 disposable label replaces expensive scanning infrastructure, recurring subscriptions, and complex reverse logistics.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="h-12 rounded-full px-8 text-base font-semibold shadow-lg" asChild>
              <Link href="/sign-up">Try TIP Today</Link>
            </Button>
            <Button size="lg" variant="ghost" className="h-12 rounded-full px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white" asChild>
              <Link href="/features">See All Features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Feature-by-Feature Comparison</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            How TIP stacks up against traditional cargo tracking solutions.
          </p>
          <div className="mt-12">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="bg-muted py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Why Shippers Switch to TIP</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Three things traditional tracking makes hard — that TIP makes effortless.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Wifi className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Infrastructure</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                No RFID readers, no Bluetooth gateways, no app installations. Your phone camera is the only tool you need to activate and track.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <DollarSign className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Recurring Costs</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                One price per label, everything included. No monthly platform fees, no data plans, no per-message charges. From $20 per shipment.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <PackageCheck className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">No Reverse Logistics</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Disposable labels mean no coordinating device returns across borders. Ship it, track it, done. No cleaning, recharging, or fleet management.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
