'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Package,
  Users,
  ShoppingCart,
  Radio,
  LayoutDashboard,
  Truck,
  Send,
  Activity,
  ClipboardList,
  DollarSign,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Labels', href: '/admin/labels', icon: Package },
  { name: 'Label Dispatch', href: '/admin/dispatch', icon: Send },
  { name: 'Track Cargo', href: '/admin/cargo', icon: Truck },
  { name: 'Devices', href: '/admin/devices', icon: Radio },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Activity },
  { name: 'Research', href: '/admin/research', icon: ClipboardList },
  { name: 'Pricing', href: '/admin/pricing', icon: DollarSign },
  { name: 'Users', href: '/admin/users', icon: Users },
]

export function AdminSidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-4">
      {navigation.map((item) => {
        const isActive =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(item.href + '/')
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
    </nav>
  )
}
