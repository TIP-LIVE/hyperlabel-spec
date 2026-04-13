import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * GET /api/v1/labels/lookup/available
 * List all labels eligible for dispatch (SOLD or INVENTORY, not in active dispatch).
 * Admin-only. Used in the label scan dialog "Browse" mode.
 */
export async function GET() {
  try {
    await requireAdmin()

    const labels = await db.label.findMany({
      where: {
        status: { in: ['SOLD', 'INVENTORY'] },
        // Exclude labels already linked to an active dispatch
        shipmentLabels: {
          none: {
            shipment: {
              type: 'LABEL_DISPATCH',
              status: { in: ['PENDING', 'IN_TRANSIT'] },
            },
          },
        },
      },
      select: {
        id: true,
        deviceId: true,
        displayId: true,
        iccid: true,
        status: true,
        batteryPct: true,
      },
      orderBy: { deviceId: 'asc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    return handleApiError(error, 'listing available labels')
  }
}
