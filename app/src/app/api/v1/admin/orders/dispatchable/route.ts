import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { PURCHASED_ORDER_FILTER } from '@/lib/dispatch-quota'
import { getOrgNamesMap } from '@/lib/admin/org-names'

/**
 * GET /api/v1/admin/orders/dispatchable
 *
 * Returns PAID/SHIPPED orders that still have dispatch capacity remaining
 * (order.quantity > sum of labelCount on active dispatches for that order).
 * Used by the admin "New Dispatch" dialog on /admin/dispatch.
 *
 * Query params:
 *   q: optional search across order id or user email
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim() || ''

    const where: Prisma.OrderWhereInput = q
      ? {
          AND: [
            PURCHASED_ORDER_FILTER,
            {
              OR: [
                { id: { contains: q, mode: 'insensitive' } },
                { user: { email: { contains: q, mode: 'insensitive' } } },
              ],
            },
          ],
        }
      : PURCHASED_ORDER_FILTER

    const orgNames = await getOrgNamesMap()

    const orders = await db.order.findMany({
      where,
      include: {
        user: { select: { email: true } },
        dispatches: {
          where: { type: 'LABEL_DISPATCH', status: { not: 'CANCELLED' } },
          select: {
            labelCount: true,
            _count: { select: { shipmentLabels: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const results = orders
      .map((o) => {
        const dispatched = o.dispatches.reduce(
          (sum, s) => sum + Math.max(s.labelCount ?? 0, s._count.shipmentLabels),
          0,
        )
        const remaining = Math.max(0, o.quantity - dispatched)
        return {
          id: o.id,
          shortId: o.id.slice(-8).toUpperCase(),
          userEmail: o.user.email,
          orgId: o.orgId,
          orgName: o.orgId ? (orgNames[o.orgId] ?? o.orgId.slice(-8)) : null,
          quantity: o.quantity,
          dispatched,
          remaining,
          createdAt: o.createdAt,
        }
      })
      .filter((o) => o.remaining > 0)

    return NextResponse.json({ orders: results })
  } catch (error) {
    return handleApiError(error, 'listing dispatchable orders')
  }
}
