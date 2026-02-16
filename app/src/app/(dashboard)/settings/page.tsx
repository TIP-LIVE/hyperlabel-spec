import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser } from '@/lib/auth'
import { UserProfile } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { isClerkConfigured } from '@/lib/clerk-config'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { DataExportButton } from '@/components/settings/data-export-button'
import { DeleteAccountButton } from '@/components/settings/delete-account-button'
import { OrgLabelSettings } from '@/components/settings/org-label-settings'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your account settings and preferences',
}

export default async function SettingsPage() {
  const clerkEnabled = isClerkConfigured()
  const user = await getCurrentUser()

  if (!user && clerkEnabled) {
    redirect('/sign-in')
  }

  // Get organization info if Clerk is enabled
  let orgName: string | null = null
  let orgRole: string | null = null
  let orgSlug: string | null = null
  if (clerkEnabled) {
    const authData = await auth()
    orgRole = authData.orgRole || null
    orgSlug = authData.orgSlug || null

    // Get org name from the session claims
    if (authData.orgId) {
      // Use the slug as a display-friendly fallback
      orgName = orgSlug
        ? orgSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : 'Your Organization'
    }
  }

  // Fallback user data for when Clerk is not configured
  const displayUser = user ?? {
    email: 'Not available',
    firstName: '',
    lastName: '',
    role: 'user',
    createdAt: new Date(),
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and preferences" />

      {/* Account Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <p className="font-medium">{displayUser.email}</p>
            </div>
            <Badge variant="outline">{displayUser.role}</Badge>
          </div>
          <Separator />
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="font-medium">
              {displayUser.firstName || displayUser.lastName
                ? `${displayUser.firstName || ''} ${displayUser.lastName || ''}`.trim()
                : 'Not set'}
            </p>
          </div>
          <Separator />
          <div>
            <Label className="text-muted-foreground">Member since</Label>
            <p className="font-medium">
              {new Date(displayUser.createdAt).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Organization - only show if Clerk is configured and user is in an org */}
      {clerkEnabled && orgName && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
            <CardDescription>Your current organization membership</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-muted-foreground">Organization</Label>
                <p className="font-medium">{orgName}</p>
              </div>
              <Badge variant="outline">
                {orgRole === 'org:admin' ? 'Admin' : 'Member'}
              </Badge>
            </div>
            {orgRole === 'org:admin' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <OrgLabelSettings />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Team Settings</Label>
                      <p className="text-sm text-muted-foreground">
                        Manage members, roles, and organization settings
                      </p>
                    </div>
                    <Link
                      href="/settings/organization"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                    >
                      Manage Team
                    </Link>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Management via Clerk - only show if Clerk is configured */}
      {clerkEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Profile & Security</CardTitle>
            <CardDescription>Manage your profile, password, and security settings</CardDescription>
          </CardHeader>
          <CardContent>
            <UserProfile
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 p-0',
                  navbar: 'hidden',
                  navbarMobileMenuButton: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                },
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Data & Privacy (GDPR) */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
          <CardDescription>Export your data or manage your privacy settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Export Your Data</Label>
              <p className="text-sm text-muted-foreground">
                Download a copy of all your data (shipments, orders, location history) as JSON
              </p>
            </div>
            <DataExportButton />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Delete Account</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <DeleteAccountButton />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
