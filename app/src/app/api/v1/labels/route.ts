import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels - List user's labels
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // B2B: org is top-level — all org members see same labels
    const orderFilter: Record<string, unknown> = {
      orgId: context.orgId,
      status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
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

    // When querying SOLD labels for cargo-shipment creation, only include
    // labels that have physically reached a delivery location — i.e. the
    // dispatch shipment containing them is DELIVERED, or the label is
    // already ACTIVE (activated in the wild). This prevents users from
    // assigning warehouse-resident labels to a cargo shipment.
    //
    // Also exclude labels that are already attached to an active cargo
    // shipment (PENDING or IN_TRANSIT). The POST /api/v1/cargo handler
    // rejects these with 400, so showing them in the dropdown only lets
    // users pick a label that can't be submitted.
    if (status === 'SOLD') {
      where.OR = [
        { status: 'ACTIVE' },
        {
          shipmentLabels: {
            some: {
              shipment: {
                type: 'LABEL_DISPATCH',
                status: { in: ['IN_TRANSIT', 'DELIVERED'] },
              },
            },
          },
        },
      ]
      // Also include labels owned by the org via dispatches (not just orders).
      // Admin-assigned labels may not have an orderLabel for this org, but
      // if they appear in one of the org's dispatches they should be usable.
      where.AND = [
        {
          OR: [
            // Linked to a paid order in this org (existing path)
            where.orderLabels as Record<string, unknown>,
            // Linked to a dispatch owned by this org
            {
              shipmentLabels: {
                some: {
                  shipment: {
                    orgId: context.orgId,
                    type: 'LABEL_DISPATCH',
                    status: { in: ['IN_TRANSIT', 'DELIVERED'] },
                  },
                },
              },
            },
          ],
        },
      ]
      delete where.orderLabels
      where.shipments = {
        none: {
          type: 'CARGO_TRACKING',
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      }
      delete where.status
    }

    const labels = await db.label.findMany({
      where,
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        status: true,
        batteryPct: true,
        activatedAt: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    return handleApiError(error, 'fetching labels')
  }
}
