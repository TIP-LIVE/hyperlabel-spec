import Link from 'next/link'
import { Package } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'TIP Privacy Policy — how we collect, use, and protect your data',
}

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: February 6, 2026</p>

        <div className="prose prose-gray mt-8 max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="mt-2 text-muted-foreground">
              TIP (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the tip.live
              website and GPS cargo tracking service. This Privacy Policy explains how we collect,
              use, disclose, and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <h3 className="mt-3 text-lg font-medium">2.1 Account Information</h3>
            <p className="mt-1 text-muted-foreground">
              When you create an account, we collect your name, email address, and authentication
              credentials (managed by our authentication provider, Clerk).
            </p>
            <h3 className="mt-3 text-lg font-medium">2.2 Location Data</h3>
            <p className="mt-1 text-muted-foreground">
              Our GPS tracking labels collect location data (latitude, longitude, altitude, speed)
              of the cargo they are attached to. This data is transmitted to our servers at
              configurable intervals (default: every 120 minutes). Location data includes GPS
              coordinates and cell tower backup coordinates.
            </p>
            <h3 className="mt-3 text-lg font-medium">2.3 Payment Information</h3>
            <p className="mt-1 text-muted-foreground">
              Payment processing is handled by Stripe. We do not store your full credit card details.
              We receive and store transaction IDs and order information.
            </p>
            <h3 className="mt-3 text-lg font-medium">2.4 Device & Usage Data</h3>
            <p className="mt-1 text-muted-foreground">
              We collect label device data including battery level, device identifiers (IMEI, ICCID),
              and connectivity status. We also collect standard web analytics data such as pages visited
              and browser type.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>To provide real-time cargo tracking services</li>
              <li>To process orders and payments</li>
              <li>To send notification emails (activation, delivery, low battery, no signal)</li>
              <li>To generate shareable tracking links</li>
              <li>To manage your account and provide customer support</li>
              <li>To improve our service and develop new features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Data Sharing</h2>
            <p className="mt-2 text-muted-foreground">
              We share limited data with the following third-party services to operate our platform:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Clerk</strong> — Authentication and user management</li>
              <li><strong>Stripe</strong> — Payment processing</li>
              <li><strong>Resend</strong> — Transactional email delivery</li>
              <li><strong>Google Maps</strong> — Map rendering and geocoding</li>
              <li><strong>Onomondo</strong> — eSIM connectivity and cell tower location</li>
              <li><strong>Vercel</strong> — Application hosting</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              We do not sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Data Retention</h2>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>Location history: 30 days after shipment delivery (free tier), 90+ days (premium)</li>
              <li>Account data: retained until account deletion</li>
              <li>Shared tracking links: expire 90 days after delivery</li>
              <li>Order records: retained for legal/accounting requirements</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Your Rights (GDPR)</h2>
            <p className="mt-2 text-muted-foreground">
              If you are in the European Economic Area (EEA) or the United Kingdom, you have the
              following rights:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate personal data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your personal data</li>
              <li><strong>Restriction:</strong> Request restricted processing of your personal data</li>
            </ul>
            <p className="mt-2 text-muted-foreground">
              To exercise these rights, use the data export and account deletion features in your{' '}
              <Link href="/settings" className="text-primary underline">
                account settings
              </Link>
              , or contact us at{' '}
              <a href="mailto:support@tip.live" className="text-primary underline">
                support@tip.live
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Data Security</h2>
            <p className="mt-2 text-muted-foreground">
              We implement appropriate technical and organisational measures to protect your data,
              including:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
              <li>TLS 1.3 encryption for all data in transit</li>
              <li>Encryption at rest for stored data</li>
              <li>Role-based access control</li>
              <li>Regular security reviews</li>
              <li>API key authentication for device endpoints</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Cookies</h2>
            <p className="mt-2 text-muted-foreground">
              We use essential cookies for authentication and session management. We do not use
              third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
            <p className="mt-2 text-muted-foreground">
              Our service is not directed to individuals under the age of 18. We do not knowingly
              collect personal data from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p className="mt-2 text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new policy on this page and updating the &ldquo;Last updated&rdquo; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p className="mt-2 text-muted-foreground">
              If you have any questions about this Privacy Policy, please contact us at:{' '}
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
