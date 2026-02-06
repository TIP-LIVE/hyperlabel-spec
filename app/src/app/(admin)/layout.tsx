import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Users,
  ShoppingCart,
  Radio,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'

const adminNavigation = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Labels', href: '/admin/labels', icon: Package },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingCart },
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
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-800 bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-gray-800 px-6">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            <span className="font-bold text-white">Admin Panel</span>
          </div>
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

        {/* Back to dashboard */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-800 p-4">
          <Button variant="ghost" className="w-full text-gray-400 hover:text-white" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-900 px-6">
          <h1 className="text-lg font-medium text-white">TIP Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <div className="h-8 w-8 rounded-full bg-primary/20" />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
