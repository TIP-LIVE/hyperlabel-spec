'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Menu } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

const navLinks = [
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/technology', label: 'Technology' },
  { href: '/#faq', label: 'FAQ' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { isLoaded, isSignedIn } = useAuth()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="dark w-[85vw] max-w-[400px] border-white/10 bg-black text-white">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Logo size="md" />
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-4 px-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-lg font-medium text-gray-400 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-3">
            {isLoaded && !isSignedIn && (
              <Button
                variant="outline"
                asChild
                className="rounded-full border-white/20 text-white hover:bg-white/10"
              >
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  Sign In
                </Link>
              </Button>
            )}
            {isLoaded && isSignedIn ? (
              <Button
                asChild
                className="rounded-full bg-[#00FF2B] text-black hover:bg-[#00DD25]"
              >
                <Link href="/dashboard" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                className="rounded-full bg-[#00FF2B] text-black hover:bg-[#00DD25]"
              >
                <Link href="/buy" onClick={() => setOpen(false)}>
                  Get Started
                </Link>
              </Button>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
