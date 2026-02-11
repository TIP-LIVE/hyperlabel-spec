import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Package,
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
import { Logo } from '@/components/ui/logo'
import { LandingFAQ } from '@/components/landing/landing-faq'
import { MobileNav } from '@/components/landing/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'TIP — Track Any Cargo, Anywhere',
  description:
    'Door-to-door cargo tracking labels. Reliable updates every 2 hours in 180+ countries. AI-powered route detection, delivery alerts. From $20 per label.',
  openGraph: {
    title: 'TIP — Door-to-Door Cargo Tracking',
    description:
      'Reliable cargo tracking every 2 hours in 180+ countries. AI-powered route detection, delivery alerts, shareable links. From $20 per label.',
  },
}

export default async function HomePage() {
  // Only check auth if Clerk is configured
  if (isClerkConfigured()) {
    const { userId } = await auth()
    if (userId) {
      redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="lg" />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href="/sign-up">Get Started</Link>
            </Button>
            <ThemeToggle />
            <MobileNav />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-muted to-background py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Door-to-Door Cargo Tracking
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Reliable tracking every 2 hours in 180+ countries. AI-powered route detection,
            delivery alerts, shareable links — from $20 per label.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/sign-up">
                Buy Labels
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#how-it-works">How It Works</Link>
            </Button>
          </div>
          <div className="mt-16 flex justify-center">
            <div className="flex h-24 w-full max-w-72 items-center justify-center gap-3 rounded-xl border-2 border-primary/30 bg-primary/5">
              <Package className="h-12 w-12 text-primary/60" />
              <div className="text-left">
                <p className="text-sm font-semibold text-primary">Tracking Label</p>
                <p className="text-xs text-muted-foreground">Peel. Stick. Track door to door.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 3 steps */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">How It Works</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Four simple steps from order to delivery.
          </p>
          <div className="mt-16 grid gap-10 md:grid-cols-4">
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ShoppingCart className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">1. Order Labels</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose how many labels you need and we ship them to your door within 3-5 business days.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <StickyNote className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">2. Activate &amp; Attach</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Scan the QR code to activate, attach the label to your cargo, and enter origin &amp; destination.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="relative flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Radio className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">3. Track Anywhere</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Follow your shipment on a live map. Share a tracking link with anyone — no account needed.
              </p>
              <div className="absolute -right-4 top-8 hidden h-8 w-8 md:block">
                <ChevronRight className="h-6 w-6 text-muted-foreground/50" />
              </div>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">4. Delivery Alert</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Get notified when your cargo arrives. The receiver confirms delivery and tracking stops automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — 6 cards */}
      <section id="features" className="scroll-mt-20 bg-muted py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Why TIP?</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Four reasons shippers choose TIP.
          </p>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Reliable Global Coverage</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Stable connection every 2 hours in 180+ countries. Track on land, sea, and air — your cargo never goes dark.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Battery className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">60+ Day Battery</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Long-lasting battery covers even the longest international shipments. Offline storage syncs when back online.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">AI Route Intelligence</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Detects flights, ocean vessels, and road transport to reconstruct your cargo&apos;s precise route — with more AI-powered intelligence on the way.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">One Price, No Surprises</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                From $20 per label. No subscription, no hidden fees. Every label includes all features.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Shareable Links</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Send a public tracking link to your consignee — no account required to view.
              </p>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Modern &amp; Simple</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Buy online, scan QR to activate, peel and stick. Track from any device — no app needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="scroll-mt-20 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Who Uses TIP?</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Any business that ships valuable cargo and needs visibility from origin to destination.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Cpu className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Electronics &amp; Components</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Phones, laptops, server parts — high-value cargo that needs tracking from factory to warehouse.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Pill className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Pharma &amp; Healthcare</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Medical equipment and pharmaceutical shipments where delivery accountability is critical.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Art &amp; Collectibles</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  One-of-a-kind items moving between galleries, auctions, and private buyers worldwide.
                </p>
              </div>
            </div>
            <div className="flex gap-4 rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Plane className="h-6 w-6 text-primary" />
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
      <section id="pricing" className="scroll-mt-20 py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Buy Labels</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            One-time purchase — no subscription, no hidden fees. Every label includes the same features.
          </p>
          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-3">
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">1 Label</h3>
              <p className="mt-1 text-sm text-muted-foreground">Single label</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">$25</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Full tracking &amp; map</li>
                <li>• Shareable link</li>
                <li>• Email notifications</li>
                <li>• Free shipping</li>
                <li>• 60+ day battery</li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/sign-up">Buy 1 Label</Link>
              </Button>
            </div>
            <div className="rounded-xl border-2 border-primary bg-card p-6 shadow-sm">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
                Best Value
              </div>
              <h3 className="text-lg font-semibold">5 Labels</h3>
              <p className="mt-1 text-sm text-muted-foreground">$22 per label</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">$110</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Same features as single</li>
                <li>• Free shipping</li>
                <li>• Save $15 vs buying one by one</li>
              </ul>
              <Button className="mt-6 w-full" asChild>
                <Link href="/sign-up">Buy 5 Labels</Link>
              </Button>
            </div>
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">10 Labels</h3>
              <p className="mt-1 text-sm text-muted-foreground">$20 per label</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">$200</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>• Same features as single</li>
                <li>• Free shipping</li>
                <li>• Lowest price per label</li>
                <li>• Save $50 vs buying one by one</li>
              </ul>
              <Button className="mt-6 w-full" variant="outline" asChild>
                <Link href="/sign-up">Buy 10 Labels</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 bg-muted py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Frequently Asked Questions</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Common questions about TIP tracking labels.
          </p>
          <div className="mx-auto mt-12 max-w-2xl">
            <LandingFAQ />
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold md:text-4xl">Get in Touch</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Questions about tracking, orders, or enterprise? We’re here to help.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
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

      {/* CTA */}
      <section className="border-t bg-primary py-16 md:py-20 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Ready to Track Door to Door?</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-90">
            Get your first tracking label and follow your cargo from pickup to delivery.
          </p>
          <Button size="lg" variant="secondary" className="mt-6" asChild>
            <Link href="/sign-up">Get Your First Label</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <Logo size="md" />
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground">
                Features
              </Link>
              <Link href="#pricing" className="hover:text-foreground">
                Pricing
              </Link>
              <Link href="#faq" className="hover:text-foreground">
                FAQ
              </Link>
              <Link href="#contact" className="hover:text-foreground">
                Contact
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </nav>
          </div>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} TIP. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
