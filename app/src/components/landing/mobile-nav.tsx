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
import { AnimatedEyeLogo } from '@/components/landing/animated-eye-logo'

const navLinks = [
  { href: '/features', label: 'Features' },
  { href: '/compare', label: 'Compare' },
  { href: '/#pricing', label: 'Pricing' },
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
      <SheetContent side="right" className="w-[85vw] max-w-[400px] border-white/10 bg-black">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AnimatedEyeLogo className="h-6 w-6" />
            <span className="text-lg font-bold text-[#00FF2B]">TIP</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-4">
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
            <Button
              asChild
              className="rounded-full bg-[#00FF2B] text-black hover:bg-[#00DD25]"
            >
              <Link href="/buy" onClick={() => setOpen(false)}>
                Buy a Label
              </Link>
            </Button>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
