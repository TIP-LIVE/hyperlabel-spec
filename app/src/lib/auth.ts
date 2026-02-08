import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { isClerkConfigured } from '@/lib/clerk-config'
import { isAdminEmail } from '@/lib/admin-whitelist'

// ============================================
// Types
// ============================================

export type AuthContext = {
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
  orgId: string
  orgRole: string // 'org:admin' | 'org:member'
}

/**
 * Get the current authenticated user from the database.
 * Creates the user record if it doesn't exist (fallback for webhook delays).
 * Returns null if Clerk is not configured.
 */
export async function getCurrentUser() {
  if (!isClerkConfigured()) {
    return null
  }

  const { userId } = await auth()

  if (!userId) {
    return null
  }

  // Try to find user in database
  let user = await db.user.findUnique({
    where: { clerkId: userId },
  })

  // If not found, sync from Clerk (webhook may not have fired yet)
  if (!user) {
    const clerkUser = await currentUser()

    if (clerkUser) {
      const emailAddress = clerkUser.emailAddresses[0]?.emailAddress || ''
      user = await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          role: isAdminEmail(emailAddress) ? 'admin' : 'user',
        },
      })
    }
  }

  return user
}

/**
 * Require authentication. Throws if not authenticated.
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  return user
}

/**
 * Check if user has admin role.
 */
export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'admin'
}

/**
 * Require admin role. Throws if not admin.
 */
export async function requireAdmin() {
  const user = await requireAuth()

  if (user.role !== 'admin') {
    throw new Error('Forbidden: Admin access required')
  }

  return user
}

// ============================================
// Organization-Aware Auth Helpers
// ============================================

/**
 * Require authentication AND an active organization.
 * Returns user, orgId, and orgRole.
 * Throws if user is not authenticated or has no active org.
 */
export async function requireOrgAuth(): Promise<AuthContext> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }

  const { orgId, orgRole } = await auth()

  if (!orgId) {
    throw new Error('Organization required')
  }

  return {
    user,
    orgId,
    orgRole: orgRole || 'org:member',
  }
}

/**
 * Check if an org role can view all org data (admin only).
 */
export function canViewAllOrgData(orgRole: string): boolean {
  return orgRole === 'org:admin'
}

/**
 * Build a Prisma where clause for org-scoped data.
 * - org:admin sees all org data
 * - org:member sees only their own data within the org
 */
export function orgScopedWhere(
  context: AuthContext,
  additionalFilters?: Record<string, unknown>
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    orgId: context.orgId,
    ...additionalFilters,
  }

  if (!canViewAllOrgData(context.orgRole)) {
    where.userId = context.user.id
  }

  return where
}

/**
 * Check if a user can access a specific record.
 * Returns true if:
 * - User is platform admin (user.role === 'admin')
 * - User is org:admin and record is in their org
 * - User owns the record (record.userId === user.id) and is in the same org
 */
export function canAccessRecord(
  context: AuthContext,
  record: { userId: string; orgId?: string | null }
): boolean {
  // Platform admin can access anything
  if (context.user.role === 'admin') return true

  // Must be in the same org
  if (record.orgId && record.orgId !== context.orgId) return false

  // org:admin can access all records in their org
  if (canViewAllOrgData(context.orgRole)) return true

  // org:member can only access own records
  return record.userId === context.user.id
}
