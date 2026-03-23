import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  MapPin,
  ShoppingCart,
  StickyNote,
  Radio,
  Battery,
  Globe,
  Brain,
  Tag,
  Share2,
  Smartphone,
  Mail,
  ChevronRight,
  Cpu,
  Pill,
  Palette,
  Plane,
} from 'lucide-react'
import { LandingFAQ } from '@/components/landing/landing-faq'
import { MarketingHeader } from '@/components/landing/marketing-header'
import { MarketingCTA } from '@/components/landing/marketing-cta'
import { MarketingFooter } from '@/components/landing/marketing-footer'
import { HeroSection } from '@/components/landing/hero-section'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP — Live Door-to-Door Tracking Label For Any Cargo',
  description:
    'Stick a tracking label on your shipment and follow it from pickup to delivery. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  openGraph: {
    title: 'TIP — Live Door-to-Door Tracking Label For Any Cargo',
    description:
      'Stick a tracking label on your shipment and follow it from pickup to delivery. Real-time location, delivery alerts, shareable links — in 180+ countries.',
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />

      <HeroSection />

      {/* How it works — 4 steps */}
      <section id="how-it-works" className="scroll-mt-20 py-14 md:py-24">
        <div className="container mx-auto px-5 md:px-4">
          <h2 className="text-center text-2xl font-bold md:text-4xl">How It Works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground md:mt-3 md:text-base">
            Four simple steps from order to delivery.
          </p>
          <div className="mt-10 grid gap-8 md:mt-16 md:grid-cols-4 md:gap-10">
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-black">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-lg font-semibold md:mt-4 md:text-xl">1. Order Labels</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Choose how many labels you need and we ship them to your door within 3-5 business days.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-black">
                <StickyNote className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-lg font-semibold md:mt-4 md:text-xl">2. Activate &amp; Attach</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Scan the QR code to activate, attach the label to your cargo, and enter origin &amp; destination.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-black">
                <Radio className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-lg font-semibold md:mt-4 md:text-xl">3. Track Anywhere</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Follow your shipment on a live map. Share a tracking link with anyone — no account needed.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-white dark:bg-primary dark:text-black">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="mt-3 text-lg font-semibold md:mt-4 md:text-xl">4. Delivery Alert</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Get notified when your cargo arrives. The receiver confirms delivery and tracking stops automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — 6 cards */}
      <section id="features" className="scroll-mt-20 bg-muted py-14 md:py-24">
        <div className="container mx-auto px-5 md:px-4">
          <h2 className="text-center text-2xl font-bold md:text-4xl">Why TIP?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground md:mt-3 md:text-base">
            Four reasons shippers choose TIP.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-16 md:gap-6 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">Reliable Global Coverage</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Stable connection every 2 hours in 180+ countries. Track on land, sea, and air — your cargo never goes dark.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Battery className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">60+ Day Battery</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Long-lasting battery covers even the longest international shipments. Offline storage syncs when back online.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">AI Route Intelligence</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Detects flights, ocean vessels, and road transport to reconstruct your cargo&apos;s precise route — with more AI-powered intelligence on the way.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Tag className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">One Price, No Surprises</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                From $20 per label. No subscription, no hidden fees. Every label includes all features.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Share2 className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">Shareable Links</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Send a public tracking link to your consignee — no account required to view.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md md:p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-semibold md:mt-4 md:text-lg">Modern &amp; Simple</h3>
              <p className="mt-1.5 text-sm text-muted-foreground md:mt-2">
                Buy online, scan QR to activate, peel and stick. Track from any device — no app needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="scroll-mt-20 py-14 md:py-24">
        <div className="container mx-auto px-5 md:px-4">
          <h2 className="text-center text-2xl font-bold md:text-4xl">Who Uses TIP?</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground md:mt-3 md:text-base">
            Any business that ships valuable cargo and needs visibility from origin to destination.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:mt-16 md:grid-cols-2 md:gap-8">
            <div className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Electronics &amp; Components</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Phones, laptops, server parts — high-value cargo that needs tracking from factory to warehouse.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Pharma &amp; Healthcare</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Medical equipment and pharmaceutical shipments where delivery accountability is critical.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Palette className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Art &amp; Collectibles</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  One-of-a-kind items moving between galleries, auctions, and private buyers worldwide.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-black text-white dark:bg-primary dark:text-black">
                <Plane className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Air Cargo &amp; Freight</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Time-critical shipments over 500 kg where carrier tracking alone isn&apos;t enough.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — one-time purchase packs */}
      <section id="pricing" className="scroll-mt-20 py-14 md:py-24">
        <div className="container mx-auto px-5 md:px-4">
          <h2 className="text-center text-2xl font-bold md:text-4xl">Buy Labels</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground md:mt-3 md:text-base">
            One-time purchase — no subscription, no hidden fees. Every label includes the same features.
          </p>
          <div className="mx-auto mt-10 grid max-w-4xl gap-4 md:mt-16 md:grid-cols-3 md:gap-8">
            <div className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <h3 className="text-lg font-semibold">1 Label</h3>
              <p className="mt-1 text-sm text-muted-foreground">Single label</p>
              <div className="mt-3 md:mt-4">
                <span className="text-3xl font-bold">$25</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground md:mt-4 md:space-y-2">
                <li>&#8226; Full tracking &amp; map</li>
                <li>&#8226; Shareable link</li>
                <li>&#8226; Email notifications</li>
                <li>&#8226; Free shipping</li>
                <li>&#8226; 60+ day battery</li>
              </ul>
              <Button className="mt-5 w-full rounded-full md:mt-6" variant="outline" asChild>
                <Link href="/sign-up">Buy 1 Label</Link>
              </Button>
            </div>
            <div className="rounded-xl border-2 border-primary bg-card p-5 shadow-sm md:p-6">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
                Best Value
              </div>
              <h3 className="text-lg font-semibold">5 Labels</h3>
              <p className="mt-1 text-sm text-muted-foreground">$22 per label</p>
              <div className="mt-3 md:mt-4">
                <span className="text-3xl font-bold">$110</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground md:mt-4 md:space-y-2">
                <li>&#8226; Same features as single</li>
                <li>&#8226; Free shipping</li>
                <li>&#8226; Save $15 vs buying one by one</li>
              </ul>
              <Button className="mt-5 w-full rounded-full md:mt-6" asChild>
                <Link href="/sign-up">Buy 5 Labels</Link>
              </Button>
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-sm md:p-6">
              <h3 className="text-lg font-semibold">10 Labels</h3>
              <p className="mt-1 text-sm text-muted-foreground">$20 per label</p>
              <div className="mt-3 md:mt-4">
                <span className="text-3xl font-bold">$200</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground md:mt-4 md:space-y-2">
                <li>&#8226; Same features as single</li>
                <li>&#8226; Free shipping</li>
                <li>&#8226; Lowest price per label</li>
                <li>&#8226; Save $50 vs buying one by one</li>
              </ul>
              <Button className="mt-5 w-full rounded-full md:mt-6" variant="outline" asChild>
                <Link href="/sign-up">Buy 10 Labels</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-muted py-14 md:py-24">
        <div className="container mx-auto px-5 md:px-4">
          <h2 className="text-center text-2xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground md:mt-3 md:text-base">
            Common questions about TIP tracking labels.
          </p>
          <div className="mx-auto mt-8 max-w-2xl md:mt-12">
            <LandingFAQ />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 py-14 md:py-24">
        <div className="container mx-auto px-5 text-center md:px-4">
          <h2 className="text-2xl font-bold md:text-4xl">Get in Touch</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground md:mt-3 md:text-base">
            Questions about tracking, orders, or enterprise? We&apos;re here to help.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 md:mt-8">
            <a
              href="mailto:support@tip.live"
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Mail className="h-4 w-4" />
              support@tip.live
            </a>
          </div>
        </div>
      </section>

      <MarketingCTA />

      <MarketingFooter />
    </div>
  )
}
