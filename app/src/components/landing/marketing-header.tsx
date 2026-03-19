import Link from 'next/link'
import { SignedIn, SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { MobileNav } from '@/components/landing/mobile-nav'

const navLinks = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/technology', label: 'Technology' },
  { href: '/#faq', label: 'FAQ' },
]

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="lg" />
        </Link>

        {/* Center nav */}
        <nav aria-label="Main navigation" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold text-white transition-colors hover:text-gray-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right — auth buttons */}
        <div className="flex items-center gap-3">
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden text-xs font-semibold text-white transition-colors hover:text-gray-300 sm:inline-flex"
            >
              Sign In
            </Link>
          </SignedOut>
          <SignedOut>
            <Button
              size="sm"
              asChild
              className="hidden h-10 rounded-full bg-[#00FF2B] px-6 text-xs font-semibold text-black hover:bg-[#00DD25] sm:inline-flex"
            >
              <Link href="/buy">Get Started</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button
              size="sm"
              asChild
              className="hidden h-10 rounded-full bg-[#00FF2B] px-6 text-xs font-semibold text-black hover:bg-[#00DD25] sm:inline-flex"
            >
              <Link href="/dashboard">Dashboard</Link>
            </Button>
          </SignedIn>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
