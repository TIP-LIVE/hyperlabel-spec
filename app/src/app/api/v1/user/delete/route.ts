import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * DELETE /api/v1/user/delete
 * GDPR Account Deletion — permanently deletes all user data
 *
 * Requires body: { "confirm": "DELETE" } to prevent accidental deletion
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Require explicit confirmation to prevent accidental deletion
    let body: { confirm?: string } = {}
    try {
      body = await req.json()
    } catch {
      // No body provided
    }

    if (body.confirm !== 'DELETE') {
      return NextResponse.json(
        { error: 'Confirmation required. Send { "confirm": "DELETE" } in request body.' },
        { status: 400 }
      )
    }

    // Delete in correct order to respect foreign key constraints
    // 1. Delete notifications
    await db.notification.deleteMany({
      where: { userId: user.id },
    })

    // 2. Delete location events for user's shipments
    const shipmentIds = await db.shipment.findMany({
      where: { userId: user.id },
      select: { id: true },
    })

    if (shipmentIds.length > 0) {
      await db.locationEvent.deleteMany({
        where: {
          shipmentId: { in: shipmentIds.map((s) => s.id) },
        },
      })
    }

    // 3. Delete shipments
    await db.shipment.deleteMany({
      where: { userId: user.id },
    })

    // 4. Delete orders (cascade removes order_labels)
    await db.order.deleteMany({
      where: { userId: user.id },
    })

    // 5. Labels that have no orders left become INVENTORY again
    await db.label.updateMany({
      where: {
        orderLabels: { none: {} },
        status: { in: ['SOLD', 'ACTIVE'] },
      },
      data: { status: 'INVENTORY' },
    })

    // 6. Delete the user record
    await db.user.delete({
      where: { id: user.id },
    })

    // Note: Clerk account deletion should be triggered separately via Clerk's API
    // or by the user through Clerk's UI. The webhook will handle sync.

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data have been permanently deleted.',
    })
  } catch (error) {
    console.error('Error deleting user account:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
