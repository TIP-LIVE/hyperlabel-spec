import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

function normalizeDeviceId(raw: string): string {
  return raw.trim().toUpperCase()
}

const bodySchema = z.object({
  deviceIds: z.array(z.string().min(1)).min(1, 'At least one device ID required').max(200),
})

type SkippedReason = 'not_found' | 'has_locations' | 'has_shipments'

/**
 * POST /api/v1/admin/labels/delete
 *
 * Admin: hard-delete labels by deviceId. Refuses any label with LocationEvents
 * or Shipments — tracking history must be preserved (see CLAUDE.md). OrderLabel
 * and ShipmentLabel rows cascade automatically.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const deviceIds = [...new Set(parsed.data.deviceIds.map(normalizeDeviceId))].filter(Boolean)

    const deleted: Array<{ deviceId: string; displayId: string | null }> = []
    const skipped: Array<{
      deviceId: string
      reason: SkippedReason
      locationCount?: number
      shipmentCount?: number
    }> = []

    for (const deviceId of deviceIds) {
      const label = await db.label.findUnique({
        where: { deviceId },
        select: { id: true, deviceId: true, displayId: true },
      })

      if (!label) {
        skipped.push({ deviceId, reason: 'not_found' })
        continue
      }

      const [locationCount, shipmentCount] = await Promise.all([
        db.locationEvent.count({ where: { labelId: label.id } }),
        db.shipment.count({ where: { labelId: label.id } }),
      ])

      if (locationCount > 0) {
        skipped.push({ deviceId, reason: 'has_locations', locationCount })
        continue
      }
      if (shipmentCount > 0) {
        skipped.push({ deviceId, reason: 'has_shipments', shipmentCount })
        continue
      }

      await db.label.delete({ where: { id: label.id } })
      deleted.push({ deviceId: label.deviceId, displayId: label.displayId })
    }

    return NextResponse.json({ success: true, deleted, skipped })
  } catch (error) {
    return handleApiError(error, 'admin delete labels')
  }
}
