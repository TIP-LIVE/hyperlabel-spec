import { UserButton, OrganizationSwitcher } from '@clerk/nextjs'
import { currentUser } from '@clerk/nextjs/server'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'
import { MobileSidebar } from '@/components/dashboard/mobile-sidebar'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'
import { ThemeToggle } from '@/components/theme-toggle'

// Avoid prerendering dashboard when Clerk is skipped (CI with pk_test_dummy); SidebarNav uses useOrganization().
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Check if Clerk is configured
  const clerkEnabled = isClerkConfigured()

  let firstName = 'User'
  let needSignIn = false

  if (clerkEnabled) {
    try {
      const user = await currentUser()

      if (!user) {
        needSignIn = true
      } else {
        firstName = user.firstName || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'User'
      }
    } catch {
      needSignIn = true
    }
  }

  if (needSignIn) {
    const h = await headers()
    const pathname = h.get('x-pathname') || '/dashboard'
    const host = h.get('x-forwarded-host') || h.get('host') || ''
    const proto = h.get('x-forwarded-proto') || 'https'
    const origin = host ? `${proto}://${host}` : ''
    const redirectUrl = origin ? `${origin}${pathname}` : pathname
    const redirectTarget = `/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`
    console.log('[dashboard layout] redirect to sign-in (needSignIn)', { pathname, redirectUrl, redirectTarget })
    redirect(redirectTarget)
  }

  const dbUser = await getCurrentUser()
  const isPlatformAdmin = dbUser?.role === 'admin'

  return (
    <div className="min-h-screen bg-muted">
      {/* Sidebar - Desktop */}
      <aside className="fixed inset-y-0 left-0 z-50 flex hidden w-64 flex-col border-r border-border bg-card lg:flex">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-border px-6">
          <Logo size="lg" />
        </div>

        {/* Navigation - grows to fill so CTA stays at bottom */}
        <div className="min-h-0 flex-1 overflow-auto">
          <SidebarNav />
        </div>

        {/* Buy Labels CTA - own block so href is always /buy */}
        <div className="shrink-0 border-t border-border p-4">
          <Link
            href="/buy"
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Buy Labels
          </Link>
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
            {isPlatformAdmin && (
              <Link
                href="/admin/labels"
                className="hidden rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:inline-flex"
              >
                Admin
              </Link>
            )}
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
                      'rounded-lg border border-border px-3 py-1.5 text-sm !text-foreground',
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
