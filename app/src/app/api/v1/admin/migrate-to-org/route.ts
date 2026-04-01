import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isAdminEmail } from '@/lib/admin-whitelist'

/**
 * POST /api/v1/admin/migrate-to-org
 *
 * One-time migration: assigns orgId to all personal records (orders, shipments,
 * saved addresses) that belong to the current user but have no orgId set.
 * This consolidates pre-org personal data into the active organization.
 */
export async function POST() {
  const user = await getCurrentUser()
  const { orgId } = await auth()

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!orgId) {
    return NextResponse.json(
      { error: 'No active organization. Switch to an org first.' },
      { status: 400 }
    )
  }

  const [orders, shipments, addresses] = await Promise.all([
    db.order.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId },
    }),
    db.shipment.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId },
    }),
    db.savedAddress.updateMany({
      where: { userId: user.id, orgId: null },
      data: { orgId },
    }),
  ])

  return NextResponse.json({
    migrated: {
      orders: orders.count,
      shipments: shipments.count,
      addresses: addresses.count,
    },
    orgId,
  })
}
