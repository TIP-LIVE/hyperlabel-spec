import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { sendDispatchDetailsRequested } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/v1/dispatch/[id]/send-reminder
 *
 * Admin action: resend the "complete your delivery details" email to the receiver.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const shipment = await db.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        status: true,
        shareCode: true,
        consigneeEmail: true,
        addressSubmittedAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (shipment.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Not a label dispatch' }, { status: 400 })
    }

    if (shipment.addressSubmittedAt) {
      return NextResponse.json({ error: 'Receiver details already submitted' }, { status: 409 })
    }

    if (!shipment.consigneeEmail) {
      return NextResponse.json({ error: 'No receiver email on this dispatch' }, { status: 400 })
    }

    const senderName =
      [shipment.user.firstName, shipment.user.lastName].filter(Boolean).join(' ') ||
      shipment.user.email

    await sendDispatchDetailsRequested({
      receiverEmail: shipment.consigneeEmail,
      senderName,
      shareCode: shipment.shareCode,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'sending dispatch reminder')
  }
}
