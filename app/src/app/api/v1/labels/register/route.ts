import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { getAllowLabelsInMultipleOrgs } from '@/lib/org-settings'
import { registerLabelsSchema } from '@/lib/validations/device'

const PAID_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'] as const

function normalizeDeviceId(raw: string): string {
  return raw.trim().toUpperCase()
}

/**
 * POST /api/v1/labels/register
 *
 * Register existing tracking labels to the current organisation by device ID.
 * Respects org setting "Allow labels in multiple organisations" (off = block if in another org).
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

    const allowMultiple = await getAllowLabelsInMultipleOrgs(context.orgId)

    const labelsToAssign: { id: string; deviceId: string }[] = []
    const alreadyInOrg: string[] = []
    const otherOrg: string[] = []
    const skippedDueToStatus: string[] = []

    for (const deviceId of deviceIds) {
      let label = await db.label.findUnique({
        where: { deviceId },
        include: {
          orderLabels: {
            include: { order: { select: { orgId: true, status: true } } },
          },
        },
      })

      if (!label) {
        label = await db.label.create({
          data: { deviceId, status: 'INVENTORY' },
          include: {
            orderLabels: { include: { order: { select: { orgId: true, status: true } } } },
          },
        })
      }

      const inThisOrg = label.orderLabels.some(
        (ol) => ol.order.orgId === context.orgId && (PAID_STATUSES as readonly string[]).includes(ol.order.status)
      )
      if (inThisOrg) {
        alreadyInOrg.push(deviceId)
        continue
      }

      const inOtherOrg = label.orderLabels.some(
        (ol) => ol.order.orgId !== context.orgId && (PAID_STATUSES as readonly string[]).includes(ol.order.status)
      )
      if (inOtherOrg && !allowMultiple) {
        otherOrg.push(deviceId)
        continue
      }

      if (label.status !== 'INVENTORY' && label.status !== 'SOLD') {
        skippedDueToStatus.push(deviceId)
        continue
      }

      labelsToAssign.push({ id: label.id, deviceId: label.deviceId })
    }

    if (otherOrg.length > 0) {
      return NextResponse.json(
        {
          error: 'Some labels are already registered to another organisation. Turn on "Allow labels in multiple organisations" in Organisation settings to add them here too.',
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
        skippedDueToStatus:
          skippedDueToStatus.length > 0 ? skippedDueToStatus : undefined,
        message:
          alreadyInOrg.length > 0
            ? 'All given labels are already in this organisation.'
            : skippedDueToStatus.length > 0
              ? 'Labels exist but are ACTIVE or DEPLETED; only INVENTORY or SOLD can be added here.'
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

    await db.orderLabel.createMany({
      data: labelsToAssign.map((l) => ({ orderId: order.id, labelId: l.id })),
      skipDuplicates: true,
    })

    await db.label.updateMany({
      where: { id: { in: labelsToAssign.map((l) => l.id) } },
      data: { status: 'SOLD' },
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
