import { OrganizationList } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Logo } from '@/components/ui/logo'
import { isClerkConfigured } from '@/lib/clerk-config'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Select Organization',
  description: 'Create or join an organization to start tracking shipments',
}

export default async function OrgSelectionPage() {
  if (!isClerkConfigured()) {
    redirect('/dashboard')
  }

  const { orgId } = await auth()

  // If user already has an active org, send them to dashboard
  if (orgId) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Branding */}
        <div className="flex flex-col items-center space-y-4 text-center">
          <Logo size="lg" className="gap-3" iconClassName="text-primary h-10 w-10" textClassName="text-3xl font-bold" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Set up your organization
            </h1>
            <p className="text-muted-foreground">
              Create or join an organization to start tracking shipments.
            </p>
          </div>
        </div>

        {/* Clerk OrganizationList */}
        <div className="flex justify-center rounded-xl border border-border bg-card p-6 shadow-sm">
          <OrganizationList
            hidePersonal={true}
            afterCreateOrganizationUrl="/dashboard"
            afterSelectOrganizationUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-none border-0 bg-transparent',
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}
