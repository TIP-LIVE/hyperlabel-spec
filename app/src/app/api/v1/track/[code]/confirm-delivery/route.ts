import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { sendShipmentDeliveredNotification, sendConsigneeDeliveredNotification } from '@/lib/notifications'
import { logger } from '@/lib/logger'
import { format } from 'date-fns'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * POST /api/v1/track/[code]/confirm-delivery
 *
 * Consignee confirms delivery and deactivates tracking.
 * Requires Clerk authentication + ownership check.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { orgId: clerkOrgId } = await auth()
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { code } = await params

    // Optional: Get confirmation details from body
    let body: { consigneeName?: string; notes?: string } = {}
    try {
      body = await req.json()
    } catch {
      // Body is optional
    }

    // Find the shipment
    const shipment = await db.shipment.findUnique({
      where: { shareCode: code },
      include: {
        label: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            notifyDelivered: true,
          },
        },
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment not found' },
        { status: 404 }
      )
    }

    // Check if sharing is enabled (QR code should work)
    if (!shipment.shareEnabled) {
      return NextResponse.json(
        { error: 'Tracking link is disabled' },
        { status: 403 }
      )
    }

    // Authorization: user must be shipment owner, same org, or matching consignee
    const isOwner = shipment.userId === user.id
    const isSameOrg = shipment.orgId && clerkOrgId && shipment.orgId === clerkOrgId
    const isConsignee = shipment.consigneeEmail && shipment.consigneeEmail.toLowerCase() === user.email.toLowerCase()
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isSameOrg && !isConsignee && !isAdmin) {
      return NextResponse.json(
        { error: 'You do not have permission to confirm delivery for this shipment' },
        { status: 403 }
      )
    }

    // Check if already delivered
    if (shipment.status === 'DELIVERED') {
      return NextResponse.json(
        { 
          error: 'Already delivered',
          deliveredAt: shipment.deliveredAt,
        },
        { status: 400 }
      )
    }

    // Check if cancelled
    if (shipment.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Shipment was cancelled' },
        { status: 400 }
      )
    }

    // Update shipment status to DELIVERED
    const now = new Date()
    const updatedShipment = await db.shipment.update({
      where: { id: shipment.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: now,
      },
    })

    // Send notification to shipper (owner)
    if (shipment.user.notifyDelivered) {
      try {
        await sendShipmentDeliveredNotification({
          userId: shipment.user.id,
          shipmentName: shipment.name || 'Shipment',
          deviceId: shipment.label?.deviceId ?? 'unknown',
          shareCode: code,
          destination: shipment.destinationAddress || 'Destination',
        })
      } catch (emailError) {
        logger.error('Failed to send delivery notification', { 
          shipmentId: shipment.id, 
          error: emailError 
        })
      }
    }

    // Send delivery confirmation email to consignee (receipt)
    if (shipment.consigneeEmail) {
      sendConsigneeDeliveredNotification({
        consigneeEmail: shipment.consigneeEmail,
        shipmentName: shipment.name || 'Shipment',
        shareCode: code,
        destinationAddress: shipment.destinationAddress,
        deliveredAt: format(now, 'PPpp'),
      }).catch((emailError) => {
        logger.error('Failed to send consignee delivery notification', {
          shipmentId: shipment.id,
          error: emailError,
        })
      })
    }

    logger.info('Shipment marked as delivered by consignee', {
      shipmentId: shipment.id,
      shareCode: code,
      consigneeName: body.consigneeName,
      deliveredAt: now,
    })

    return NextResponse.json({
      success: true,
      message: 'Delivery confirmed successfully',
      shipment: {
        id: updatedShipment.id,
        status: updatedShipment.status,
        deliveredAt: updatedShipment.deliveredAt,
      },
    })
  } catch (error) {
    logger.error('Error confirming delivery', { error })
    return NextResponse.json(
      { error: 'Failed to confirm delivery' },
      { status: 500 }
    )
  }
}
