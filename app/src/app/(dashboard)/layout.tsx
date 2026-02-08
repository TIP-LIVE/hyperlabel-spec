import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { redirect } from 'next/navigation'
import { isClerkConfigured } from '@/lib/clerk-config'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Check if Clerk is configured
  const clerkEnabled = isClerkConfigured()

  let firstName = 'User'

  if (clerkEnabled) {
    const user = await currentUser()

    if (!user) {
      redirect('/sign-in')
    }

    firstName = user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'
  }

  return (
    <div className="min-h-screen bg-muted">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-border bg-card lg:block">
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Logo size="lg" />
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* Buy Labels CTA */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-4">
          <Button asChild className="w-full">
            <Link href="/buy">Buy Labels</Link>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          {/* Mobile menu button */}
          <MobileSidebar />

          {/* Mobile logo */}
          <Link href="/dashboard" className="lg:hidden">
            <Logo size="md" />
          </Link>

          {/* Greeting - Desktop */}
          <div className="hidden lg:block">
            <p className="text-sm text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{firstName}</span>
            </p>
          </div>

          {/* Org switcher + Theme toggle + User button */}
          <div className="flex items-center gap-2">
            {clerkEnabled && (
              <OrganizationSwitcher
                hidePersonal={true}
                afterCreateOrganizationUrl="/dashboard"
                afterSelectOrganizationUrl="/dashboard"
                afterLeaveOrganizationUrl="/org-selection"
                appearance={{
                  elements: {
                    rootBox: 'hidden lg:flex',
                    organizationSwitcherTrigger:
                      'rounded-lg border border-border px-3 py-1.5 text-sm',
                  },
                }}
              />
            )}
            <ThemeToggle />
            {clerkEnabled ? (
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'h-9 w-9',
                  },
                }}
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10" />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
