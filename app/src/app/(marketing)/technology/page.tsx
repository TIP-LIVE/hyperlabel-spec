import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ComparisonTable } from '@/components/landing/comparison-table'
import { Wifi, DollarSign, PackageCheck } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP vs Traditional Tracking Solutions | Compare',
  description:
    'Compare TIP disposable tracking labels against RFID, Bluetooth, and enterprise trackers. No scanners, no subscriptions, no return logistics.',
}

export default function ComparePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-black py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-headline text-4xl text-white md:text-5xl lg:text-6xl">
            TIP vs. Traditional Tracking
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            See how a $20 disposable label replaces expensive scanning infrastructure, recurring subscriptions, and complex reverse logistics.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 rounded-full bg-[#00FF2B] px-8 text-base font-semibold text-black shadow-lg hover:bg-[#00DD25]"
              asChild
            >
              <Link href="/buy">Try TIP Today</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full border border-white/20 px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/how-it-works">See All Features</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="bg-black py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-white md:text-4xl">Feature-by-Feature Comparison</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
            How TIP stacks up against traditional cargo tracking solutions.
          </p>
          <div className="mt-12">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="border-t border-white/5 bg-white/[0.02] py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-white md:text-4xl">Why Shippers Switch to TIP</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
            Three things traditional tracking makes hard — that TIP makes effortless.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            {[
              {
                icon: Wifi,
                title: 'No Infrastructure',
                desc: 'No RFID readers, no Bluetooth gateways, no app installations. Your phone camera is the only tool you need to activate and track.',
              },
              {
                icon: DollarSign,
                title: 'No Recurring Costs',
                desc: 'One price per label, everything included. No monthly platform fees, no data plans, no per-message charges. From $20 per shipment.',
              },
              {
                icon: PackageCheck,
                title: 'No Reverse Logistics',
                desc: 'Disposable labels mean no coordinating device returns across borders. Ship it, track it, done. No cleaning, recharging, or fleet management.',
              },
            ].map((card) => (
              <div key={card.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.05]">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF2B] text-black">
                  <card.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{card.title}</h3>
                <p className="mt-2 text-sm text-gray-400">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
