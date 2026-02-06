import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { getCurrentUser } from '@/lib/auth'
import { UserProfile } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { isClerkConfigured } from '@/lib/clerk-config'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { DataExportButton } from '@/components/settings/data-export-button'
import { DeleteAccountButton } from '@/components/settings/delete-account-button'
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

  // Fallback user data for when Clerk is not configured
  const displayUser = user ?? {
    email: 'demo@example.com',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    createdAt: new Date(),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

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
