'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { OrganizationSwitcher } from '@clerk/nextjs'
import { MapPin, Package, ShoppingCart, BookUser, Settings, LayoutDashboard, Menu } from 'lucide-react'
import { Logo } from '@/components/ui/logo'
import { isClerkConfigured } from '@/lib/clerk-config'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Shipments', href: '/shipments', icon: MapPin },
  { name: 'Labels', href: '/labels', icon: Package },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Addresses', href: '/address-book', icon: BookUser },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function MobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="xl:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[85vw] max-w-[300px] flex-col p-0">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>
            <Logo size="md" />
          </SheetTitle>
        </SheetHeader>
        {isClerkConfigured() && (
          <div className="shrink-0 border-b border-border px-4 py-3">
            <OrganizationSwitcher
              hidePersonal={true}
              afterCreateOrganizationUrl="/dashboard"
              afterSelectOrganizationUrl="/dashboard"
              afterLeaveOrganizationUrl="/org-selection"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  organizationSwitcherTrigger:
                    'w-full justify-between rounded-lg border border-border px-3 py-1.5 text-sm !text-foreground',
                  organizationSwitcherPopoverCard: 'bg-popover border border-border shadow-lg',
                  organizationPreviewMainIdentifier: '!text-foreground',
                  organizationPreviewSecondaryIdentifier: '!text-muted-foreground',
                  organizationSwitcherPopoverActionButton: '!text-foreground hover:!bg-accent',
                  organizationSwitcherPopoverActionButtonText: '!text-foreground',
                  organizationSwitcherPopoverActionButtonIcon: '!text-muted-foreground',
                  organizationSwitcherPopoverFooter: 'hidden',
                },
              }}
            />
          </div>
        )}
        <nav className="min-h-0 flex-1 overflow-auto p-4">
          <div className="flex flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[44px] active:bg-accent/80 active:scale-[0.98]',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border p-4">
          <Link
            href="/buy"
            onClick={() => setOpen(false)}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Buy Labels
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  )
}
