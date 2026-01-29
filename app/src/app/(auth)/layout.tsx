import { Package } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between bg-primary p-10 text-primary-foreground">
        <Link href="/" className="flex items-center gap-2">
          <Package className="h-8 w-8" />
          <span className="text-xl font-bold">HyperLabel</span>
        </Link>

        <div className="space-y-4">
          <blockquote className="text-lg">
            &ldquo;HyperLabel has transformed how we track our international shipments. Real-time
            visibility has reduced our lost cargo incidents by 90%.&rdquo;
          </blockquote>
          <p className="text-sm opacity-80">— Logistics Manager, Global Freight Co.</p>
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
          <Link href="/" className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">HyperLabel</span>
          </Link>
        </div>

        {/* Auth content */}
        <div className="flex-1 flex items-center justify-center p-6">{children}</div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} HyperLabel. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
