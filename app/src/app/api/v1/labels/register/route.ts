import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { registerLabelsSchema } from '@/lib/validations/device'

/**
 * Normalize device ID for lookup/display (trim, optional uppercase).
 */
function normalizeDeviceId(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * POST /api/v1/labels/register
 *
 * Register existing tracking labels to the current organisation by device ID.
 * Creates labels in INVENTORY if they don't exist, then assigns them to a new
 * "registration" order (PAID, £0) so they appear under Total Labels and can
 * be used for shipments.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = registerLabelsSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const deviceIds = [...new Set(validated.data.deviceIds.map(normalizeDeviceId))].filter(Boolean)
    if (deviceIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid device ID is required' },
        { status: 400 }
      )
    }

    const labelsToAssign: { id: string; deviceId: string }[] = []
    const alreadyInOrg: string[] = []
    const otherOrg: string[] = []

    for (const deviceId of deviceIds) {
      let label = await db.label.findUnique({
        where: { deviceId },
      })

      if (!label) {
        label = await db.label.create({
          data: {
            deviceId,
            status: 'INVENTORY',
          },
        })
      }

      if (label.orderId) {
        const order = await db.order.findUnique({
          where: { id: label.orderId },
          select: { orgId: true },
        })
        if (order?.orgId === context.orgId) {
          alreadyInOrg.push(deviceId)
          continue
        }
        otherOrg.push(deviceId)
        continue
      }

      if (label.status !== 'INVENTORY') {
        // Already sold/active/depleted but no order (edge case) — skip
        continue
      }

      labelsToAssign.push({ id: label.id, deviceId: label.deviceId })
    }

    if (otherOrg.length > 0) {
      return NextResponse.json(
        {
          error: 'Some labels are already registered to another organisation',
          deviceIds: otherOrg,
        },
        { status: 409 }
      )
    }

    if (labelsToAssign.length === 0) {
      return NextResponse.json({
        success: true,
        order: null,
        registered: 0,
        alreadyInOrg: alreadyInOrg.length > 0 ? alreadyInOrg : undefined,
        message:
          alreadyInOrg.length > 0
            ? 'All given labels are already in this organisation.'
            : 'No labels to register.',
      })
    }

    const order = await db.order.create({
      data: {
        userId: context.user.id,
        orgId: context.orgId,
        status: 'PAID',
        totalAmount: 0,
        currency: 'GBP',
        quantity: labelsToAssign.length,
      },
    })

    await db.label.updateMany({
      where: { id: { in: labelsToAssign.map((l) => l.id) } },
      data: { orderId: order.id, status: 'SOLD' },
    })

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        quantity: order.quantity,
      },
      registered: labelsToAssign.length,
      labels: labelsToAssign.map((l) => l.deviceId),
      alreadyInOrg: alreadyInOrg.length > 0 ? alreadyInOrg : undefined,
    })
  } catch (error) {
    return handleApiError(error, 'registering labels')
  }
}
