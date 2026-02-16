import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canViewAllOrgData } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels - List user's labels
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Build where clause - labels owned by org through orders
    const orderFilter: Record<string, unknown> = {
      orgId: context.orgId,
      status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
    }
    if (!canViewAllOrgData(context.orgRole)) {
      orderFilter.userId = context.user.id
    }

    const where: Record<string, unknown> = {
      orderLabels: {
        some: {
          order: {
            ...orderFilter,
            status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
          },
        },
      },
    }

    if (status) {
      where.status = status
    }

    const labels = await db.label.findMany({
      where,
      select: {
        id: true,
        deviceId: true,
        status: true,
        batteryPct: true,
        activatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    return handleApiError(error, 'fetching labels')
  }
}
