'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useOrganization } from '@clerk/nextjs'
import { LayoutDashboard, MapPin, Package, ShoppingCart, BookUser, Settings, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isClerkConfigured } from '@/lib/clerk-config'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Shipments', href: '/shipments', icon: MapPin },
  { name: 'Labels', href: '/labels', icon: Package },
  { name: 'Orders', href: '/orders', icon: ShoppingCart },
  { name: 'Addresses', href: '/address-book', icon: BookUser },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()
  const clerkEnabled = isClerkConfigured()
  // Always call the hook to satisfy React's rules of hooks.
  // When Clerk is not configured, useOrganization() returns undefined membership.
  const { membership } = useOrganization()

  const isOrgAdmin = clerkEnabled && membership?.role === 'org:admin'

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] active:bg-accent/80 active:scale-[0.98]',
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
      {clerkEnabled && isOrgAdmin && (
        <Link
          href="/settings/organization"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-[44px] active:bg-accent/80 active:scale-[0.98]',
            pathname === '/settings/organization' || pathname.startsWith('/settings/organization/')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Building2 className="h-5 w-5" />
          Team
        </Link>
      )}
    </nav>
  )
}
