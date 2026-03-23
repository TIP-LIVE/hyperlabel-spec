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
import {
  Package,
  Users,
  ShoppingCart,
  Radio,
  LayoutDashboard,
  ArrowLeft,
  Truck,
  Send,
  Menu,
  Activity,
  ClipboardList,
} from 'lucide-react'
import { Logo } from '@/components/ui/logo'
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
  { name: 'Users', href: '/admin/users', icon: Users },
]

export function AdminMobileSidebar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground xl:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[85vw] max-w-[300px] flex-col border-border bg-card p-0">
        <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
          <SheetTitle>
            <Logo size="md" />
          </SheetTitle>
        </SheetHeader>
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
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
