import { OrganizationProfile } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Team Settings',
  description: 'Manage your organization members and settings',
}

export default async function OrganizationSettingsPage() {
  const clerkEnabled = isClerkConfigured()

  if (!clerkEnabled) {
    redirect('/settings')
  }

  const { orgId, orgRole } = await auth()

  if (!orgId) {
    redirect('/org-selection')
  }

  // Only org:admin can access this page
  if (orgRole !== 'org:admin') {
    redirect('/settings')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization members and settings
        </p>
      </div>

      {/* Clerk OrganizationProfile */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <OrganizationProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border-0 bg-transparent',
              navbar: 'hidden',
              navbarMobileMenuButton: 'hidden',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            },
          }}
        />
      </div>
    </div>
  )
}
