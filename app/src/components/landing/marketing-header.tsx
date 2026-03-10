import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { MobileNav } from '@/components/landing/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/compare', label: 'Compare' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/#faq', label: 'FAQ' },
]

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="lg" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button size="sm" asChild className="hidden rounded-full px-5 sm:inline-flex">
            <Link href="/sign-up">Get Started</Link>
          </Button>
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  )
}
