import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FeatureSection } from '@/components/landing/feature-section'
import {
  Smartphone,
  Tag,
  Zap,
  PackageCheck,
  Share2,
  Globe,
  Battery,
  Radio,
  Cpu,
} from 'lucide-react'
import { getCheapestPerLabel, getLabelPacks, toDisplayPacks } from '@/lib/pricing'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Features — How TIP Tracking Labels Work',
  description:
    'LTE Cat-1 cellular, QR activation in 30 seconds, no subscriptions, disposable design, shareable tracking links. Technical details on TIP tracking labels.',
}

function fmt(dollars: number): string {
  return Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)
}

export default async function FeaturesPage() {
  const cheapestPerLabel = await getCheapestPerLabel()
  const fromPrice = `$${fmt(cheapestPerLabel)}`
  const packs = toDisplayPacks(await getLabelPacks())
  const highestPerLabel = packs.length > 0 ? Math.max(...packs.map((p) => p.perLabel)) : cheapestPerLabel
  const perLabelRange =
    cheapestPerLabel === highestPerLabel
      ? `$${fmt(cheapestPerLabel)}`
      : `$${fmt(cheapestPerLabel)}-${fmt(highestPerLabel)}`

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 bg-black py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-headline text-4xl text-white md:text-5xl lg:text-6xl">
            Built for Simplicity
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
            Buy. Dispatch. Activate. Track. Five core capabilities that make door-to-door
            cargo visibility as simple as 1-2-3.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-12 rounded-full bg-[#00FF2B] px-8 text-base font-semibold text-black shadow-lg hover:bg-[#00DD25]"
              asChild
            >
              <Link href="/buy">Get Started</Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 rounded-full border border-white/20 px-8 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/technology">Compare Solutions</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature 1: No Scanners Required */}
      <FeatureSection
        icon={Smartphone}
        title="No Scanners Required"
        subtitle="Your phone is the only tool you need"
        description="TIP uses LTE Cat-1 cellular connectivity to transmit location data directly to the cloud. To activate, simply scan the QR code printed on the label with any smartphone camera — no barcode scanners, RFID readers, Bluetooth gateways, or dedicated infrastructure required. The label connects to cellular networks in 180+ countries via an embedded softSIM."
        specs={[
          { label: 'Connectivity', value: 'LTE Cat-1' },
          { label: 'Activation', value: 'QR code' },
          { label: 'Coverage', value: '180+ countries' },
          { label: 'Readers needed', value: 'None' },
          { label: 'SIM card', value: 'Embedded' },
          { label: 'Infrastructure', value: 'Zero' },
        ]}
      />

      {/* Feature 2: No Subscription Fees */}
      <FeatureSection
        icon={Tag}
        title="No Subscription Fees"
        subtitle="One price, everything included"
        description={`Every TIP label is a one-time purchase starting from ${fromPrice}. The price includes 60+ days of cellular connectivity via the embedded softSIM, full platform access for tracking and management, shareable public tracking links, email notifications, and AI-powered route intelligence. No monthly fees, no data plans, no per-message charges, no hidden costs.`}
        specs={[
          { label: 'Starting price', value: `From ${fromPrice}` },
          { label: 'Connectivity', value: 'Included' },
          { label: 'Platform access', value: 'Included' },
          { label: 'Sharing', value: 'Unlimited' },
          { label: 'Monthly fee', value: '$0' },
          { label: 'Data plan', value: 'Not needed' },
        ]}
        reversed
        muted
      />

      {/* Feature 3: Buy → Dispatch → Activate → Track */}
      <FeatureSection
        icon={Zap}
        title="Buy. Dispatch. Activate. Track."
        subtitle="Four steps from order to door-to-door visibility"
        description="TIP labels are held in our warehouse, ready to ship. After buying, you tell us where to dispatch them — your office, a forwarder, or directly to your supplier in 180+ countries. The receiver pulls the activation tab and sticks the label on the cargo. From the very next signal, you can follow the shipment door-to-door on a live map. No charging cycles, no app downloads, no IT integration, and no training sessions required. The whole flow takes minutes per label."
        specs={[
          { label: 'Activation time', value: '< 30 seconds' },
          { label: 'Worldwide dispatch', value: '180+ countries' },
          { label: 'Receiver setup', value: 'Pull tab' },
          { label: 'App download', value: 'Not needed' },
          { label: 'IT integration', value: 'Not needed' },
          { label: 'Training', value: 'Not needed' },
        ]}
      />

      {/* Feature 4: No Return Logistics */}
      <FeatureSection
        icon={PackageCheck}
        title="No Return Logistics"
        subtitle="Ship it, track it, done"
        description={`TIP labels are designed as single-use devices. At ${perLabelRange} per label, there is no need to coordinate device returns across international borders, manage inventory of reusable trackers, or handle cleaning and recharging cycles. This eliminates the reverse logistics cost that makes enterprise trackers prohibitively expensive for most shipments — where device return shipping alone can exceed the cost of a TIP label.`}
        specs={[
          { label: 'Device type', value: 'Single-use' },
          { label: 'Return shipping', value: 'None' },
          { label: 'Fleet management', value: 'Not needed' },
          { label: 'Recharging', value: 'Not needed' },
          { label: 'Cleaning', value: 'Not needed' },
          { label: 'Depot returns', value: 'Not needed' },
        ]}
        reversed
        muted
      />

      {/* Feature 5: Shareable Tracking */}
      <FeatureSection
        icon={Share2}
        title="Shareable Tracking Links"
        subtitle="Anyone can track — no account needed"
        description="Every TIP shipment generates a public tracking link that can be shared with consignees, partners, and customers via email, messaging apps, or any other channel. Recipients open the link in any web browser and see the live tracking map, route history, and estimated arrival — with zero app downloads and zero account creation. Unlike most competitor platforms that gate tracking behind a login, TIP makes visibility instantly accessible to everyone in the supply chain."
        specs={[
          { label: 'Link type', value: 'Public URL' },
          { label: 'App required', value: 'No' },
          { label: 'Account required', value: 'No' },
          { label: 'Works on', value: 'Any browser' },
          { label: 'Live map', value: 'Included' },
          { label: 'Route history', value: 'Included' },
        ]}
      />

      {/* Specs Summary Grid */}
      <section className="border-t border-white/5 bg-white/[0.02] py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold text-white md:text-4xl">At a Glance</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-gray-400">
            The key technical specs behind every TIP label.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Globe, value: '180+', label: 'Countries Covered' },
              { icon: Battery, value: '60+', label: 'Day Battery Life' },
              { icon: Radio, value: '2hr', label: 'Update Interval' },
              { icon: Cpu, value: 'LTE', label: 'Cat-1 Cellular' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF2B] text-black">
                  <item.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-2xl font-bold text-white">{item.value}</div>
                <div className="mt-1 text-sm text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
