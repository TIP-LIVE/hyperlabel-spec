import Link from 'next/link'
import { SignedOut } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { AnimatedEyeLogo } from '@/components/landing/animated-eye-logo'
import { MobileNav } from '@/components/landing/mobile-nav'

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/compare', label: 'Compare' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
]

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <AnimatedEyeLogo className="h-8 w-8" />
          <span className="text-xl font-bold text-[#00FF2B]">TIP</span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SignedOut>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-gray-400 hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </SignedOut>
          <Button
            size="sm"
            asChild
            className="hidden rounded-full bg-[#00FF2B] px-5 text-black hover:bg-[#00DD25] sm:inline-flex"
          >
            <Link href="/buy">Buy a Label</Link>
          </Button>
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
