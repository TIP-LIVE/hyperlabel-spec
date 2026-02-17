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

  try {
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
        const data = {
          email: emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          role: (isAdminEmail(emailAddress) ? 'admin' : 'user') as 'admin' | 'user',
        }
        const existingByEmail = await db.user.findUnique({ where: { email: emailAddress } })
        if (existingByEmail) {
          user = await db.user.update({
            where: { id: existingByEmail.id },
            data: { clerkId: clerkUser.id, ...data },
          })
        } else {
          user = await db.user.create({
            data: { clerkId: clerkUser.id, ...data },
          })
        }
      }
    }

    return user
  } catch {
    return null
  }
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

/** Whether the user is an org admin (e.g. for editing org settings). */
export function canViewAllOrgData(orgRole: string): boolean {
  return orgRole === 'org:admin'
}

/**
 * Build a Prisma where clause for org-scoped data.
 * B2B: org is the top-level entity — all org members see the same labels, shipments, orders.
 * No per-user filtering within an org.
 */
export function orgScopedWhere(
  context: AuthContext,
  additionalFilters?: Record<string, unknown>
): Record<string, unknown> {
  return {
    orgId: context.orgId,
    ...additionalFilters,
  }
}

/**
 * Check if a user can access a specific record.
 * B2B: any member of the same org can access org data.
 * Returns true if:
 * - User is platform admin (user.role === 'admin'), or
 * - Record belongs to the user's current org (record.orgId === context.orgId)
 */
export function canAccessRecord(
  context: AuthContext,
  record: { userId: string; orgId?: string | null }
): boolean {
  if (context.user.role === 'admin') return true
  if (record.orgId && record.orgId !== context.orgId) return false
  return true
}
