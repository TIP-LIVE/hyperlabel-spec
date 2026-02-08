import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { isClerkConfigured } from '@/lib/clerk-config'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Include org info if Clerk is configured
    let orgId: string | null = null
    let orgRole: string | null = null
    let orgSlug: string | null = null

    if (isClerkConfigured()) {
      const session = await auth()
      orgId = session.orgId ?? null
      orgRole = session.orgRole ?? null
      orgSlug = session.orgSlug ?? null
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      role: user.role,
      createdAt: user.createdAt,
      orgId,
      orgRole,
      orgSlug,
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
