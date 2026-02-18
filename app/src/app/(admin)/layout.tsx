import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Users,
  ShoppingCart,
  Radio,
  LayoutDashboard,
  ArrowLeft,
  Truck,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'
import { SignOutButton } from '@clerk/nextjs'
import { AdminMobileSidebar } from '@/components/admin/admin-mobile-sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

const adminNavigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Labels', href: '/admin/labels', icon: Package },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { name: 'Shipments', href: '/admin/shipments', icon: Truck },
  { name: 'Devices', href: '/admin/devices', icon: Radio },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  // Check if user is authenticated and is admin
  if (isClerkConfigured()) {
    if (!user) {
      redirect('/sign-in')
    }
    if (user.role !== 'admin') {
      redirect('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-gray-800 bg-gray-900 lg:block">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <Logo size="md" iconClassName="text-primary" textClassName="text-white" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-4">
          {adminNavigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 space-y-1 border-t border-gray-800 p-4">
          <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          {isClerkConfigured() && (
            <SignOutButton>
              <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </SignOutButton>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 lg:px-6">
          {/* Mobile menu button */}
          <AdminMobileSidebar />

          {/* Mobile logo */}
          <Link href="/admin" className="lg:hidden">
            <Logo size="md" iconClassName="text-primary" textClassName="text-white" />
          </Link>

          {/* Desktop title */}
          <h1 className="hidden text-lg font-medium text-white lg:block">TIP Admin</h1>
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Client View
              </Link>
            </Button>
            <ThemeToggle />
            <span className="hidden text-sm text-gray-400 sm:block">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-primary/20" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
