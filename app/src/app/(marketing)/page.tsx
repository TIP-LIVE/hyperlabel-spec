import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { LandingFAQ } from '@/components/landing/landing-faq'
import { MarketingCTA } from '@/components/landing/marketing-cta'
import { StructuredData } from '@/components/landing/structured-data'
import { AnimatedSection } from '@/components/landing/animated-section'
import { CountUp } from '@/components/landing/count-up'
import { IndustriesSection } from '@/components/landing/industries-section'
import { Check, X, Mail } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP — Door-to-Door Cargo Tracking',
  description:
    'Buy tracking labels, dispatch them anywhere in the world, and follow your cargo door-to-door. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  openGraph: {
    title: 'TIP — Door-to-Door Cargo Tracking',
    description:
      'Buy tracking labels, dispatch them anywhere in the world, and follow your cargo door-to-door. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  },
}

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — video background */}
      <HeroSection />

      {/* 2. Live Tracking Label — No Blind Spots */}
      <section className="py-8 md:py-10">
        <div className="container mx-auto px-4">
          {/* Centered heading */}
          <div className="text-center">
            <p className="text-label-expanded text-white">
              First Ever
            </p>
            <h2 className="text-headline mt-2 text-3xl text-white md:text-5xl lg:text-[55px]">
              Live Tracking Label
              <br />
              With <span className="text-[red]">No Blind</span>{' '}
              Spots
            </h2>
            <p className="text-label-expanded mt-2 text-white">
              Applicable to any cargo
            </p>
          </div>

          {/* Three-column: features | label image | specs */}
          <div className="mx-auto mt-4 grid max-w-5xl items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
            {/* Left — features */}
            <div className="space-y-0">
              {[
                { title: 'No Scanners Required', subtitle: 'Works with any phone' },
                { title: 'No Subscription Fees', subtitle: 'One-time purchase' },
                { title: '30-Second Activation', subtitle: 'Scan QR and go' },
                { title: 'No Return Logistics', subtitle: 'Disposable label' },
                { title: 'Shareable Tracking Links', subtitle: 'No app needed' },
              ].map((item) => (
                <div key={item.title} className="border-b border-white/20 py-3">
                  <p className="text-[24px] font-bold leading-[0.9] tracking-[-0.96px] text-white">{item.title}</p>
                  <p className="mt-1 text-[24px] font-bold leading-[0.9] tracking-[-0.96px] text-white/30">{item.subtitle}</p>
                </div>
              ))}
            </div>

            {/* Center — TIP label product image with dimensions */}
            <div className="relative flex justify-center">
              <Image
                src="/images/tip-label-3d.webp"
                alt="TIP tracking label product"
                width={620}
                height={620}
                className="w-[400px] lg:w-[500px] drop-shadow-2xl"
                priority
              />
            </div>

            {/* Right — specs */}
            <div className="space-y-0">
              {[
                { value: '180', subtitle: 'Countries Covered' },
                { value: '60+', subtitle: 'Days Battery Life' },
                { value: '2HR', subtitle: 'Update Interval' },
                { value: 'LTE', subtitle: 'Cat-1 Cellular' },
                { value: '1', subtitle: 'Miminum Order' },
              ].map((item) => (
                <div key={item.subtitle} className="border-b border-white/20 py-3 text-right">
                  <p className="text-[24px] font-bold leading-[0.9] tracking-[-0.96px] text-white">{item.value}</p>
                  <p className="mt-1 text-[24px] font-bold leading-[0.9] tracking-[-0.96px] text-white/30">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why TIP — 6 statements on green + bold statement */}
      <section id="features" className="scroll-mt-20 bg-[#00FF00] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-4xl text-black md:text-[55px]">
            Why to TIP your cargo?
          </h2>
          <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: 'eye-01', text: 'There\u2019s no other door-to-door tracking service' },
              { icon: 'eye-02', text: 'Every existing service has blind spots' },
              { icon: 'eye-03', text: 'There\u2019s usually 20+ chains in a chain, not connected with each other' },
              { icon: 'eye-04', text: 'Most shipments are blind, other visible only at part of the way' },
              { icon: 'eye-05', text: 'Shipment from Temu has better tracking than helicopter engine' },
              { icon: 'eye-06', text: 'Cost of lost shipment exceeds cost of tracking label in 99% of cases' },
            ].map(({ icon, text }, i) => (
              <AnimatedSection key={i} delay={i * 100}>
                <div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/images/${icon}.svg`}
                    alt=""
                    className="mb-4 h-12 w-12"
                    aria-hidden="true"
                  />
                  <p className="text-xl font-semibold leading-tight tracking-tight text-black md:text-[30px] md:leading-none">
                    {text}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Divider + bold statement */}
          <div className="mt-16 border-t-2 border-black/20 pt-16">
            <h2 className="text-headline max-w-[941px] text-5xl text-black md:text-7xl lg:text-[90px]">
              TIP is the only way to understand where is your cargo
            </h2>
          </div>
        </div>
      </section>

      {/* 4. Full-width photo — hand placing label on box */}
      <section className="bg-black px-4 md:px-8">
        <div className="overflow-hidden rounded-[40px]">
          <Image
            src="/images/tip-box-photo.webp"
            alt="Hand placing TIP tracking label on a cargo box"
            width={2560}
            height={1440}
            className="w-full object-cover"
          />
        </div>
      </section>

      {/* 5. How it works — 4 steps */}
      <section id="how-it-works" className="scroll-mt-20 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-4xl text-white md:text-[55px]">
            How to tip your cargo
          </h2>
          <div className="mt-8 grid gap-10 md:grid-cols-4">
            {[
              { num: '1', title: 'Buy Labels', desc: 'Choose how many labels you need. Your order is reserved at our warehouse, ready to dispatch.', icon: '/images/step-order.svg' },
              { num: '2', title: 'Dispatch Anywhere', desc: 'Tell us where to ship the labels — your office, a forwarder, or directly to your supplier in 180+ countries.', icon: '/images/step-activate.svg' },
              { num: '3', title: 'Activate & Track', desc: 'The receiver pulls the tab to activate. Tracking starts automatically — no app, no setup.', icon: '/images/step-track.svg' },
              { num: '4', title: 'Door to Door', desc: 'Follow your cargo on a live map and share a tracking link with anyone — no account needed.', icon: '/images/step-delivery.svg' },
            ].map(({ num, title, desc, icon }, i) => (
              <AnimatedSection key={num} delay={i * 150}>
                <div className="flex h-full flex-col">
                  <p className="text-[30px] font-semibold leading-none tracking-tight text-white">{num}</p>
                  <p className="mt-1 text-[30px] font-semibold leading-none tracking-tight text-white">{title}</p>
                  <p className="mt-2 flex-1 text-sm font-semibold leading-tight tracking-tight text-white/30">{desc}</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={icon} alt="" className="mt-4 h-10 w-10" aria-hidden="true" />
                </div>
              </AnimatedSection>
            ))}
          </div>
          <div className="mt-8 h-px bg-white/20" />
        </div>
      </section>

      {/* 6. Send to sender */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 h-px bg-white/20" />
          <h2 className="text-headline max-w-[805px] text-4xl text-white md:text-[55px]">
            And yes, you can send TIP label to your sender to{' '}
            <span className="text-[#00FF2B]">track it from anywhere</span>
          </h2>
        </div>
      </section>

      {/* 7. TIP vs Other Tracking */}
      <section className="scroll-mt-20 py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-4xl text-white md:text-[55px]">
            TIP vs Other Tracking
          </h2>
          <div className="mt-8 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-5 py-4 text-sm font-semibold text-gray-500">Feature</th>
                  <th className="border-x border-t border-[#00FF2B] bg-[#00FF2B]/[0.08] px-5 py-4 text-center text-sm font-semibold text-white">
                    <span className="mb-1 inline-block rounded-full bg-[#00FF2B] px-3 py-0.5 text-xs font-bold text-black">Best Value</span>
                    <br />TIP
                  </th>
                  <th className="px-5 py-4 text-center text-sm font-semibold text-gray-500">Traditional RFID</th>
                  <th className="px-5 py-4 text-center text-sm font-semibold text-gray-500">Bluetooth Trackers</th>
                  <th className="px-5 py-4 text-center text-sm font-semibold text-gray-500">Enterprise GPS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { feature: 'No Scanners or Readers Needed', sub: 'Works with any smartphone camera', tip: '✓', rfid: '✗', bt: '✗', gps: '✓' },
                  { feature: 'No Subscription Fees', sub: 'One-time purchase, everything included', tip: '✓', rfid: '✗', bt: '✗', gps: '✗' },
                  { feature: 'Instant Activation', sub: 'Ready to track in under 30 seconds', tip: '< 30 sec', rfid: '5-15 min', bt: '2-5 min', gps: '1-5 min' },
                  { feature: 'No Return Logistics', sub: 'Disposable — no reverse shipping required', tip: '✓', rfid: '✓', bt: '✗', gps: '✗' },
                  { feature: 'Shareable Tracking Links', sub: 'Anyone can track — no app or account needed', tip: '✓', rfid: '✗', bt: '✗', gps: '✗' },
                  { feature: 'Global Coverage', sub: 'Track across borders on land, sea, and air', tip: '180+ countries', rfid: 'Facility only', bt: '~30m range', gps: '180+ countries' },
                  { feature: 'AI Route Intelligence', sub: 'Auto-detect flights, vessels, road transport', tip: '✓', rfid: '✗', bt: '✗', gps: '✗' },
                  { feature: 'Battery Life', sub: 'Tracking duration per device', tip: '60+ days', rfid: 'No battery', bt: '1-6 months', gps: '10-60 days' },
                  { feature: 'Cost Per Shipment', sub: 'All-in price to track one shipment', tip: 'From $20', rfid: '$0.10-2 + reader', bt: '$10-30 + gateway', gps: '$100-500+' },
                ].map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? 'bg-white/[0.06]' : 'bg-white/[0.02]'}>
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-white">{row.feature}</p>
                      <p className="text-xs text-gray-500">{row.sub}</p>
                    </td>
                    <td className={`border-x border-[#00FF2B] bg-[#00FF2B]/[0.05] px-5 py-3 text-center ${i === 8 ? 'border-b' : ''}`}>
                      <ComparisonCell value={row.tip} highlight />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <ComparisonCell value={row.rfid} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <ComparisonCell value={row.bt} />
                    </td>
                    <td className="px-5 py-3 text-center">
                      <ComparisonCell value={row.gps} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Green accent bar at bottom */}
            <div className="h-1 bg-[#00FF2B]" />
          </div>
        </div>
      </section>

      {/* 8. Dashboard preview — green background */}
      <section className="bg-[#00FF2B] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-[608px] text-center">
            <h2 className="text-headline text-4xl text-black md:text-[55px]">
              One place to track all of your cargo
            </h2>
            <p className="mt-6 text-lg font-medium tracking-tight text-black/70">
              All that you need to track your cargo in one simple interface
            </p>
          </div>
          <div className="relative mx-auto mt-12 max-w-[1018px]">
            {/* TIP logo badge */}
            <div className="absolute left-2 top-2 z-10 rounded-xl bg-[#171717] px-4 py-2">
              <svg viewBox="0 0 34 34" fill="none" className="inline-block h-5 w-5" aria-hidden="true">
                <circle cx="16.77" cy="16.77" r="16.77" fill="white" />
                <circle cx="22.12" cy="11.85" r="6.55" fill="black" />
              </svg>
            </div>
            <div className="overflow-hidden rounded-[19px] shadow-2xl">
              <Image
                src="/images/tip-map-screenshot.webp"
                alt="TIP dashboard showing shipments on a world map"
                width={2800}
                height={1439}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 9. Industries — interactive layout */}
      <IndustriesSection />

      {/* 10. Outcomes — green background */}
      <section className="bg-[#00FF2B] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-headline text-center text-4xl text-black md:text-[55px]">
              TIP outcomes
            </h2>
          </AnimatedSection>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { end: 30, prefix: '-', suffix: '%', label: 'amount of mistakes' },
              { end: 40, prefix: '-', suffix: '%', label: 'operational costs' },
              { end: 50, prefix: '+', suffix: '%', label: 'accelerate shipment' },
              { end: 0, prefix: '', suffix: '%', label: 'blind zones' },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 150}>
                <div>
                  <p className="text-headline text-6xl text-black md:text-7xl lg:text-[88px]">
                    <CountUp end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                  </p>
                  <p className="mt-3 text-2xl font-bold leading-[0.9] tracking-tight text-black/30 md:text-[32px]">{stat.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Pricing */}
      <section id="pricing" className="scroll-mt-20 bg-[#0A0A0A] py-16 md:py-20">
        {/* Green accent bar */}
        <div className="h-1 bg-[#00FF2B]" />
        <div className="container mx-auto px-4 pt-16">
          <h2 className="text-headline text-center text-4xl text-white md:text-[55px]">
            Buy TIP Labels
          </h2>
          <p className="mx-auto mt-4 max-w-[259px] text-center text-sm font-semibold tracking-tight text-white/30">
            One-time purchase — no subscription, no hidden fees. Every label includes the same features.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            {/* 1 Label */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-semibold text-white">1 Label</h3>
              <p className="mt-1 text-sm text-gray-500">Single label</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$25</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>&bull; Full tracking &amp; map</li>
                <li>&bull; Shareable link</li>
                <li>&bull; Email notifications</li>
                <li>&bull; Free shipping</li>
                <li>&bull; 60+ day battery</li>
              </ul>
              <Button
                className="mt-6 w-full rounded-full border-white/20 text-white hover:bg-white/10"
                variant="outline"
                asChild
              >
                <Link href="/buy?pack=starter">Buy 1 Label</Link>
              </Button>
            </div>

            {/* 5 Labels — Best Value */}
            <div className="rounded-xl border-2 border-[#00FF2B] bg-white/[0.03] p-6">
              <div className="mb-2 text-label-expanded text-[#00FF2B]">
                Best Value
              </div>
              <h3 className="text-lg font-semibold text-white">5 Labels</h3>
              <p className="mt-1 text-sm text-gray-500">$22 per label</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$110</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>&bull; Same features as single</li>
                <li>&bull; Free shipping</li>
                <li>&bull; Save $15 vs buying one by one</li>
              </ul>
              <Button
                className="mt-6 w-full rounded-full bg-[#00FF2B] text-black hover:bg-[#00DD25]"
                asChild
              >
                <Link href="/buy?pack=team">Buy 5 Labels</Link>
              </Button>
            </div>

            {/* 10 Labels */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-semibold text-white">10 Labels</h3>
              <p className="mt-1 text-sm text-gray-500">$20 per label</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-white">$200</span>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-gray-400">
                <li>&bull; Same features as single</li>
                <li>&bull; Free shipping</li>
                <li>&bull; Lowest price per label</li>
                <li>&bull; Save $50 vs buying one by one</li>
              </ul>
              <Button
                className="mt-6 w-full rounded-full border-white/20 text-white hover:bg-white/10"
                variant="outline"
                asChild
              >
                <Link href="/buy?pack=volume">Buy 10 Labels</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 12. FAQ — dark background */}
      <section id="faq" className="scroll-mt-20 bg-[#1A1A1A] py-16 md:py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-4xl text-white md:text-[55px]">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-500">
            Common questions about TIP tracking labels.
          </p>
          <div className="mx-auto mt-12 max-w-2xl">
            <LandingFAQ />
          </div>
        </div>
      </section>

      {/* 13. Get in Touch CTA */}
      <section id="contact" className="bg-black py-16 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-headline text-3xl text-white md:text-[55px]">Get in Touch</h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Questions about tracking, orders, or enterprise? We&apos;re here to
            help.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
            <a
              href="mailto:support@tip.live"
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
            >
              <Mail className="h-4 w-4" />
              support@tip.live
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA />

      {/* Structured Data */}
      <StructuredData />
    </>
  )
}

/** Comparison table cell — renders check/X or text value */
function ComparisonCell({ value, highlight }: { value: string; highlight?: boolean }) {
  if (value === '✓') {
    return <Check className={`mx-auto h-5 w-5 ${highlight ? 'text-[#00FF2B]' : 'text-gray-500'}`} aria-label="Yes" />
  }
  if (value === '✗') {
    return <X className="mx-auto h-5 w-5 text-gray-600" aria-label="No" />
  }
  return (
    <span className={`text-sm font-semibold ${highlight ? 'text-[#00FF2B]' : 'text-gray-400'}`}>
      {value}
    </span>
  )
}
