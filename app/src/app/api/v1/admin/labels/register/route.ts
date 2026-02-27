import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

function normalizeDeviceId(raw: string): string {
  return raw.trim().toUpperCase()
}

const assignmentSchema = z.object({
  orgId: z.string().min(1, 'Organisation ID is required'),
  deviceIds: z.array(z.string().min(1)).min(1, 'At least one device ID required').max(200),
  userId: z.string().optional(),
})

const bodySchema = z.object({
  assignments: z.array(assignmentSchema).min(1, 'At least one assignment required').max(20),
})

/**
 * POST /api/v1/admin/labels/register
 *
 * Admin: assign labels to one or more organisations.
 * Creates labels in INVENTORY if missing; reassigns from other orgs if needed.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin()

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const results: Array<{
      orgId: string
      orderId: string | null
      registered: number
      labels: string[]
      skipped: string[]
      skippedAlreadyInOrg?: string[]
      error?: string
    }> = []

    for (const { orgId, deviceIds: rawDeviceIds, userId: providedUserId } of parsed.data.assignments) {
      const deviceIds = [...new Set(rawDeviceIds.map(normalizeDeviceId))].filter(Boolean)
      if (deviceIds.length === 0) {
        results.push({ orgId, orderId: null, registered: 0, labels: [], skipped: [], error: 'No valid device IDs' })
        continue
      }

      let userId = providedUserId
      if (!userId) {
        const existingOrder = await db.order.findFirst({
          where: { orgId },
          select: { userId: true },
        })
        if (existingOrder) {
          userId = existingOrder.userId
        } else {
          // Org has no orders yet (e.g. brand‑new Clerk org). Use current admin as order owner
          // so assignment works without a bootstrap script or “create an order first”.
          userId = adminUser.id
        }
      }

      const labelsToAssign: { id: string; deviceId: string }[] = []
      const skipped: string[] = []
      const skippedAlreadyInOrg: string[] = []

      if (process.env.NODE_ENV !== 'test') {
        console.info('[Register] assignment orgId:', orgId, 'deviceIds:', deviceIds)
      }

      for (const deviceId of deviceIds) {
        let label = await db.label.findUnique({
          where: { deviceId },
          include: {
            orderLabels: {
              where: { order: { orgId, status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] } } },
              select: { labelId: true },
            },
          },
        })

        if (!label) {
          label = await db.label.create({
            data: { deviceId, status: 'INVENTORY' },
            include: { orderLabels: true },
          })
        }

        const alreadyInThisOrg = label.orderLabels.length > 0
        if (process.env.NODE_ENV !== 'test' && alreadyInThisOrg) {
          console.info('[Register] skip (already in org)', { deviceId, orgId, orderLabelsInOrg: label.orderLabels.length })
        }
        if (alreadyInThisOrg) {
          skipped.push(deviceId)
          skippedAlreadyInOrg.push(deviceId)
          continue
        }
        labelsToAssign.push({ id: label.id, deviceId: label.deviceId })
      }

      if (labelsToAssign.length === 0) {
        results.push({
          orgId,
          orderId: null,
          registered: 0,
          labels: [],
          skipped,
          ...(skippedAlreadyInOrg.length > 0 && { skippedAlreadyInOrg }),
        })
        continue
      }

      const order = await db.order.create({
        data: {
          userId,
          orgId,
          status: 'PAID',
          totalAmount: 0,
          currency: 'GBP',
          quantity: labelsToAssign.length,
        },
      })

      await db.orderLabel.createMany({
        data: labelsToAssign.map((l) => ({ orderId: order.id, labelId: l.id })),
        skipDuplicates: true,
      })

      await db.label.updateMany({
        where: { id: { in: labelsToAssign.map((l) => l.id) } },
        data: { status: 'SOLD' },
      })

      results.push({
        orgId,
        orderId: order.id,
        registered: labelsToAssign.length,
        labels: labelsToAssign.map((l) => l.deviceId),
        skipped: skipped.length > 0 ? skipped : [],
        ...(skippedAlreadyInOrg.length > 0 && { skippedAlreadyInOrg }),
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return handleApiError(error, 'admin register labels')
  }
}
