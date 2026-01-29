import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { isClerkConfigured } from '@/lib/clerk-config'

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
      user = await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
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
