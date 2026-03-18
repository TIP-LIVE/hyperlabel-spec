import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroSection } from '@/components/landing/hero-section'
import { LandingFAQ } from '@/components/landing/landing-faq'
import { MarketingCTA } from '@/components/landing/marketing-cta'
import { StructuredData } from '@/components/landing/structured-data'
import { AnimatedSection } from '@/components/landing/animated-section'
import { CountUp } from '@/components/landing/count-up'
import {
  Globe,
  Battery,
  Brain,
  Tag,
  Share2,
  Smartphone,
  ShoppingCart,
  StickyNote,
  Radio,
  MapPin,
  Mail,
  Check,
  X,
} from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP — Door-to-Door Cargo Tracking',
  description:
    'Attach a tracking label to your shipment and follow it from pickup to delivery. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  openGraph: {
    title: 'TIP — Door-to-Door Cargo Tracking',
    description:
      'Attach a tracking label to your shipment and follow it from pickup to delivery. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  },
}

export default function HomePage() {
  return (
    <>
      {/* 1. Hero — video background */}
      <HeroSection />

      {/* 2. Live Tracking Label — No Blind Spots */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          {/* Centered heading */}
          <div className="text-center">
            <p className="text-sm font-bold italic uppercase tracking-[0.25em] text-gray-400">
              First Ever
            </p>
            <h2 className="text-headline mt-4 text-4xl text-white md:text-6xl lg:text-7xl">
              Live Tracking Label
              <br />
              With No{' '}
              <span className="text-destructive line-through decoration-destructive">
                Blind
              </span>{' '}
              Spots
            </h2>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.25em] text-gray-400">
              Applicable to any cargo.
            </p>
          </div>

          {/* Three-column: features | label image | specs */}
          <div className="mx-auto mt-16 grid max-w-6xl items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
            {/* Left — features */}
            <div className="space-y-0">
              {[
                { title: 'No Scanners Required', subtitle: 'Countries Covered' },
                { title: 'No Subscription Fees', subtitle: 'Days Battery Life' },
                { title: '30-Second Activation', subtitle: 'Update Interval' },
                { title: 'No Return Logistics', subtitle: 'Update Interval' },
                { title: 'Shareable Tracking Links', subtitle: 'Cat-1 Cellular' },
              ].map((item) => (
                <div key={item.title} className="border-b border-white/10 py-4">
                  <p className="text-base font-bold text-white md:text-lg">{item.title}</p>
                  <p className="text-xs text-gray-500 italic">{item.subtitle}</p>
                </div>
              ))}
            </div>

            {/* Center — TIP label product image */}
            <div className="flex justify-center">
              <Image
                src="/images/tip-label-3d.webp"
                alt="TIP tracking label product"
                width={600}
                height={600}
                className="drop-shadow-2xl"
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
                { value: '1', subtitle: 'Minimum Order' },
              ].map((item) => (
                <div key={item.subtitle} className="border-b border-white/10 py-4 text-right">
                  <p className="text-2xl font-bold text-white md:text-3xl">{item.value}</p>
                  <p className="text-xs text-gray-500 italic">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Why TIP — 6 feature cards */}
      <section id="features" className="scroll-mt-20 border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
            Why TIP your cargo?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
            There&apos;s no other door-to-door tracking service that&apos;s this
            simple, affordable, and reliable.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Globe,
                title: 'Reliable Global Coverage',
                desc: 'Stable connection every 2 hours in 180+ countries. Track on land, sea, and air — your cargo never goes dark.',
              },
              {
                icon: Battery,
                title: '60+ Day Battery',
                desc: 'Long-lasting battery covers even the longest international shipments. Offline storage syncs when back online.',
              },
              {
                icon: Brain,
                title: 'AI Route Intelligence',
                desc: 'Detects flights, ocean vessels, and road transport to reconstruct your cargo\u2019s precise route.',
              },
              {
                icon: Tag,
                title: 'One Price, No Surprises',
                desc: 'From $20 per label. No subscription, no hidden fees. Every label includes all features.',
              },
              {
                icon: Share2,
                title: 'Shareable Links',
                desc: 'Send a public tracking link to your consignee — no account required to view.',
              },
              {
                icon: Smartphone,
                title: 'Modern & Simple',
                desc: 'Buy online, scan QR to activate, peel and stick. Track from any device — no app needed.',
              },
            ].map(({ icon: Icon, title, desc }, i) => (
              <AnimatedSection key={title} delay={i * 100}>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-6 transition-colors hover:bg-white/[0.06]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#00FF2B] text-black">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Full-width image — "Only way to understand" */}
      <section className="relative overflow-hidden py-32 md:py-44">
        <Image
          src="/images/tip-box-photo.webp"
          alt="TIP label on cargo box in transit"
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="relative z-10 container mx-auto px-4">
          <h2 className="text-headline max-w-2xl text-3xl text-white md:text-5xl lg:text-6xl">
            The only way to know exactly where your cargo is
          </h2>
        </div>
      </section>

      {/* 5. How it works — 4 steps */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
            How to tip your cargo
          </h2>
          <div className="mt-16 grid gap-10 md:grid-cols-4">
            {[
              { num: '1', icon: ShoppingCart, title: 'Order Label', desc: 'Choose how many labels you need. We ship them within 3-5 business days.' },
              { num: '2', icon: StickyNote, title: 'Activate & Attach', desc: 'Scan the QR code, enter origin & destination, peel and stick.' },
              { num: '3', icon: Radio, title: 'Track Anywhere', desc: 'Follow your shipment on a live map. Share a tracking link with anyone.' },
              { num: '4', icon: MapPin, title: 'Get Delivery Alert', desc: 'Get notified when your cargo arrives. Tracking stops automatically.' },
            ].map(({ num, icon: Icon, title, desc }, i) => (
              <AnimatedSection key={num} delay={i * 150}>
                <div className="flex flex-col items-center text-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00FF2B]/30 bg-[#00FF2B]/10">
                    <span className="text-2xl font-bold text-[#00FF2B]">{num}</span>
                  </div>
                  <Icon className="mt-4 h-6 w-6 text-gray-500" />
                  <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-gray-400">{desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Send to sender */}
      <section className="border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-headline text-3xl text-white md:text-5xl">
                Send a TIP label to your sender and track from anywhere
              </h2>
              <p className="mt-6 text-gray-400">
                Ship the label to your supplier or factory. They attach it to
                your cargo and you track it from day one — full visibility from
                origin to destination.
              </p>
            </div>
            <div className="flex justify-center">
              <Image
                src="/images/tip-label-3d.webp"
                alt="TIP tracking label 3D render"
                width={600}
                height={600}
                className="drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 7. TIP vs Other Tracking */}
      <section className="scroll-mt-20 border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
            TIP vs Other Tracking
          </h2>
          <div className="mx-auto mt-12 max-w-4xl overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="pb-4 pr-6 text-gray-500">Feature</th>
                  <th className="pb-4 pr-6 font-semibold text-[#00FF2B]">TIP Label</th>
                  <th className="pb-4 pr-6 text-gray-500">Customer Trackers</th>
                  <th className="pb-4 text-gray-500">Enterprise Trackers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { feature: 'No Scanners Required', tip: true, customer: false, enterprise: true },
                  { feature: 'No Subscription Fees', tip: true, customer: false, enterprise: false },
                  { feature: '30-Second Activation', tip: true, customer: false, enterprise: false },
                  { feature: 'No Return Logistics', tip: true, customer: true, enterprise: false },
                  { feature: 'Shareable Tracking Links', tip: true, customer: false, enterprise: false },
                  { feature: 'Global Coverage (180+)', tip: true, customer: false, enterprise: true },
                  { feature: 'AI Route Detection', tip: true, customer: false, enterprise: false },
                  { feature: '60+ Day Battery', tip: true, customer: false, enterprise: true },
                  { feature: 'From $20 / Shipment', tip: true, customer: false, enterprise: false },
                ].map((row) => (
                  <tr key={row.feature} className="text-gray-300">
                    <td className="py-3 pr-6">{row.feature}</td>
                    <td className="py-3 pr-6">
                      {row.tip ? (
                        <Check className="h-5 w-5 text-[#00FF2B]" aria-label="Yes" />
                      ) : (
                        <X className="h-5 w-5 text-gray-600" aria-label="No" />
                      )}
                    </td>
                    <td className="py-3 pr-6">
                      {row.customer ? (
                        <Check className="h-5 w-5 text-gray-500" aria-label="Yes" />
                      ) : (
                        <X className="h-5 w-5 text-gray-600" aria-label="No" />
                      )}
                    </td>
                    <td className="py-3">
                      {row.enterprise ? (
                        <Check className="h-5 w-5 text-gray-500" aria-label="Yes" />
                      ) : (
                        <X className="h-5 w-5 text-gray-600" aria-label="No" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 8. Dashboard preview — map screenshot */}
      <section className="border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-headline text-3xl text-white md:text-5xl">
            One place to track all of your cargo
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-gray-400">
            See every shipment on a single map. Filter by status, search by
            name, and share links — all from one dashboard.
          </p>
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-xl border border-white/10 shadow-2xl">
            <Image
              src="/images/tip-map-screenshot.webp"
              alt="TIP dashboard showing shipments on a world map"
              width={2800}
              height={1439}
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* 9. Industries */}
      <section className="border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-headline text-3xl text-white md:text-5xl">
                Industries that rely on TIP
              </h2>
            </div>
            <div className="grid gap-4 grid-cols-2">
              {[
                { title: 'Electronics', image: '/images/tip-electronics.webp' },
                { title: 'Pharma & Healthcare', image: '/images/tip-pharma-healthcare.webp' },
                { title: 'Art & Collectibles', image: '/images/tip-art-collectibles.webp' },
                { title: 'Air Cargo & Freight', image: '/images/tip-air-cargo-freight.webp' },
              ].map((industry) => (
                <div
                  key={industry.title}
                  className="group relative overflow-hidden rounded-xl"
                >
                  <Image
                    src={industry.image}
                    alt={industry.title}
                    width={1200}
                    height={1200}
                    className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <h3 className="absolute bottom-4 left-4 text-lg font-semibold text-white">
                    {industry.title}
                  </h3>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 10. Outcomes */}
      <section className="border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <AnimatedSection>
            <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
              Real Results
            </h2>
          </AnimatedSection>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { end: 30, prefix: '-', suffix: '%', label: 'Damage Claims' },
              { end: 40, prefix: '-', suffix: '%', label: 'Lost Shipments' },
              { end: 50, prefix: '+', suffix: '%', label: 'Supply Chain Visibility' },
              { end: 0, prefix: '', suffix: '%', label: 'Subscription Fees' },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 150}>
                <div className="text-center">
                  <p className="text-headline text-5xl text-[#00FF2B] md:text-6xl">
                    <CountUp end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                  </p>
                  <p className="mt-3 text-sm text-gray-400">{stat.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* 11. Pricing */}
      <section id="pricing" className="scroll-mt-20 border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
            Buy TIP Labels
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
            One-time purchase — no subscription, no hidden fees. Every label
            includes the same features.
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
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[#00FF2B]">
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

      {/* 12. FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-headline text-center text-3xl text-white md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-gray-400">
            Common questions about TIP tracking labels.
          </p>
          <div className="mx-auto mt-12 max-w-2xl">
            <LandingFAQ />
          </div>
        </div>
      </section>

      {/* 13. Get in Touch CTA */}
      <section id="contact" className="border-t border-white/5 py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-headline text-3xl text-white md:text-5xl">Get in Touch</h2>
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
