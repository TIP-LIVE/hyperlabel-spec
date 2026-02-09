import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { sendRoleChangedNotification } from '@/lib/notifications'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const roleSchema = z.object({
  role: z.enum(['user', 'admin']),
})

/**
 * PATCH /api/v1/admin/users/[id]/role
 * Update a user's role (admin only)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const currentAdmin = await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = roleSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    // Prevent self-demotion
    if (id === currentAdmin.id && validated.data.role !== 'admin') {
      return NextResponse.json(
        { error: 'You cannot remove your own admin role' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id } })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated = await db.user.update({
      where: { id },
      data: { role: validated.data.role },
    })

    // Send email notification to the affected user (fire and forget)
    const adminName = [currentAdmin.firstName, currentAdmin.lastName].filter(Boolean).join(' ') || 'An admin'
    sendRoleChangedNotification({
      userId: updated.id,
      newRole: validated.data.role,
      changedByName: adminName,
    }).catch((err) => console.error('Failed to send role change notification:', err))

    return NextResponse.json({ user: { id: updated.id, role: updated.role } })
  } catch (error) {
    return handleApiError(error, 'updating user role')
  }
}
