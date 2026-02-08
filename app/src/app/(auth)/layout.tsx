import Link from 'next/link'
import { Logo } from '@/components/ui/logo'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <Link href="/">
          <Logo size="lg" iconClassName="text-primary-foreground" textClassName="text-primary-foreground" />
        </Link>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Door-to-Door Cargo Tracking</h2>
          <p className="text-lg opacity-90">
            Stick a tracking label on your shipment and follow it from pickup to delivery.
            Real-time visibility across land, sea, and air — in 180+ countries.
          </p>
          <ul className="space-y-2 text-sm opacity-80">
            <li>&#10003; No black holes — offline storage syncs automatically</li>
            <li>&#10003; Works with any carrier, any route</li>
            <li>&#10003; Share tracking links — no account needed to view</li>
          </ul>
        </div>

        <div className="flex items-center gap-8 text-sm opacity-80">
          <div>
            <div className="text-2xl font-bold">60+</div>
            <div>Days battery life</div>
          </div>
          <div>
            <div className="text-2xl font-bold">Global</div>
            <div>Coverage</div>
          </div>
          <div>
            <div className="text-2xl font-bold">Real-time</div>
            <div>Tracking</div>
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <Link href="/">
            <Logo size="md" />
          </Link>
        </div>

        {/* Auth content */}
        <div className="flex-1 flex items-center justify-center px-4 py-6 sm:p-6">{children}</div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TIP. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
