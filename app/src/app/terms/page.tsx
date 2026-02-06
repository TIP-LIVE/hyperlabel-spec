import Link from 'next/link'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'TIP Terms of Service — terms and conditions for using our cargo tracking service',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">TIP</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: February 6, 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Agreement to Terms</h2>
            <p className="mt-2 text-muted-foreground">
              By accessing or using TIP (tip.live), you agree to be bound by these Terms of Service.
              If you do not agree to these terms, do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="mt-2 text-muted-foreground">
              TIP provides disposable GPS tracking labels for cargo shipments. Our service includes:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Physical GPS tracking label devices</li>
              <li>Real-time cargo tracking via our web platform</li>
              <li>Email notifications for shipment events</li>
              <li>Shareable public tracking links</li>
              <li>Global cellular connectivity (180+ countries)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="mt-2 text-muted-foreground">
              You must create an account to purchase labels and use our tracking service. You are
              responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. You must provide accurate and complete
              information when creating your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Purchases & Payments</h2>
            <h3 className="mt-3 text-lg font-medium">4.1 Pricing</h3>
            <p className="mt-1 text-muted-foreground">
              Label prices are displayed on our website at the time of purchase. All prices are in GBP
              unless otherwise stated. Prices include free shipping to supported regions (China, UK,
              EU, US).
            </p>
            <h3 className="mt-3 text-lg font-medium">4.2 Payment</h3>
            <p className="mt-1 text-muted-foreground">
              Payments are processed securely via Stripe. By making a purchase, you agree to
              Stripe&apos;s terms of service.
            </p>
            <h3 className="mt-3 text-lg font-medium">4.3 What&apos;s Included</h3>
            <p className="mt-1 text-muted-foreground">
              Each label purchase includes: the physical tracking device, free shipping, 60 days of
              GPS tracking, global eSIM connectivity, platform access, email notifications, and
              shareable tracking links.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Refund Policy</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Defective label:</strong> Full replacement or refund</li>
              <li><strong>Unused (sealed) label:</strong> Refund within 30 days of purchase</li>
              <li><strong>Activated label:</strong> No refund (label is single-use)</li>
              <li><strong>Cancelled shipment:</strong> No refund if label has been activated</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Acceptable Use</h2>
            <p className="mt-2 text-muted-foreground">You agree not to:</p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Use our service for any unlawful purpose</li>
              <li>Track individuals without their knowledge or consent</li>
              <li>Interfere with or disrupt the service</li>
              <li>Attempt to gain unauthorised access to our systems</li>
              <li>Reverse engineer or tamper with the tracking labels</li>
              <li>Use the service to ship prohibited or illegal goods</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Service Limitations</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>
                Tracking accuracy depends on GPS signal availability and cellular coverage
              </li>
              <li>
                Labels are single-use, disposable devices with approximately 60 days of battery life
              </li>
              <li>
                We do not guarantee uninterrupted tracking (coverage gaps during flights, ocean
                transit, or remote areas are expected but data is stored and transmitted when
                connectivity returns)
              </li>
              <li>We target 99.5% platform uptime but do not guarantee it</li>
              <li>
                We are not a carrier, freight forwarder, or insurance provider — we provide
                visibility only
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Intellectual Property</h2>
            <p className="mt-2 text-muted-foreground">
              The TIP name, logo, and all content on tip.live are owned by us or our licensors. You
              may not use our branding without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Limitation of Liability</h2>
            <p className="mt-2 text-muted-foreground">
              TIP provides a tracking visibility service only. We are not liable for:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Loss, damage, or delay of cargo</li>
              <li>Decisions made based on tracking data</li>
              <li>Temporary service interruptions</li>
              <li>Inaccurate location data due to GPS/cellular limitations</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              To the maximum extent permitted by law, our total liability shall not exceed the amount
              you paid for the labels in question.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Data & Privacy</h2>
            <p className="mt-2 text-muted-foreground">
              Your use of our service is also governed by our{' '}
              <Link href="/privacy" className="text-primary underline">
                Privacy Policy
              </Link>
              . By using TIP, you consent to the collection and processing of data as described
              therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Termination</h2>
            <p className="mt-2 text-muted-foreground">
              We may suspend or terminate your account at our discretion if you violate these terms.
              You may delete your account at any time via your account settings. Upon termination,
              your tracking data will be deleted in accordance with our data retention policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Governing Law</h2>
            <p className="mt-2 text-muted-foreground">
              These terms are governed by and construed in accordance with the laws of England and
              Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of
              England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">13. Changes to Terms</h2>
            <p className="mt-2 text-muted-foreground">
              We may update these terms from time to time. Continued use of the service after changes
              constitutes acceptance of the revised terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">14. Contact</h2>
            <p className="mt-2 text-muted-foreground">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:support@tip.live" className="text-primary underline">
                support@tip.live
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} TIP. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
