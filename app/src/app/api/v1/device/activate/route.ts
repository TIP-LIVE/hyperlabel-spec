import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { activateLabelSchema } from '@/lib/validations/device'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

/**
 * POST /api/v1/device/activate
 * 
 * Activates a label after QR code scan.
 * Links the label to the user and optionally to a shipment.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = activateLabelSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { deviceId, shipmentId } = validated.data

    // Find the label
    const label = await db.label.findUnique({
      where: { deviceId },
      include: {
        order: true,
      },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Check if label is in a valid state for activation
    if (label.status !== 'SOLD') {
      if (label.status === 'INVENTORY') {
        return NextResponse.json(
          { error: 'Label not purchased', details: 'This label has not been sold yet' },
          { status: 400 }
        )
      }
      if (label.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'Label already active', details: 'This label is already activated' },
          { status: 400 }
        )
      }
      if (label.status === 'DEPLETED') {
        return NextResponse.json(
          { error: 'Label depleted', details: 'This label battery is depleted' },
          { status: 400 }
        )
      }
    }

    // Verify ownership through order - org-aware check
    if (label.order) {
      const sameOrg = label.order.orgId && label.order.orgId === context.orgId
      const sameUser = label.order.userId === context.user.id
      if (!sameOrg && !sameUser) {
        return NextResponse.json(
          { error: 'Forbidden', details: 'You do not own this label' },
          { status: 403 }
        )
      }
    }

    // Activate the label
    const updatedLabel = await db.label.update({
      where: { id: label.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    })

    // If a shipment ID was provided, link the label to it
    let linkedShipment = null
    if (shipmentId) {
      const shipment = await db.shipment.findUnique({
        where: { id: shipmentId },
      })

      if (shipment && (shipment.userId === context.user.id || (shipment.orgId && shipment.orgId === context.orgId))) {
        linkedShipment = await db.shipment.update({
          where: { id: shipmentId },
          data: { labelId: label.id },
        })
      }
    }

    return NextResponse.json({
      success: true,
      label: {
        id: updatedLabel.id,
        deviceId: updatedLabel.deviceId,
        status: updatedLabel.status,
        activatedAt: updatedLabel.activatedAt,
      },
      shipment: linkedShipment
        ? {
            id: linkedShipment.id,
            shareCode: linkedShipment.shareCode,
          }
        : null,
    })
  } catch (error) {
    return handleApiError(error, 'activating label')
  }
}
