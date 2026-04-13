import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rateLimit, RATE_LIMIT_CHECKOUT, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { shipperAddressSchema } from '@/lib/validations/address'
import { getCountryName } from '@/lib/constants/countries'
import { sendDispatchDetailsSubmitted, sendDispatchAddressConfirmedToReceiver } from '@/lib/notifications'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * POST /api/v1/track/[code]/submit-address
 *
 * Public endpoint for shippers to submit their delivery address.
 * Rate limit: 10 req/min per IP (write operation).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const rl = rateLimit(`submit-addr:${getClientIp(req)}`, RATE_LIMIT_CHECKOUT)
    if (!rl.success) return rateLimitResponse(rl)

    const { code } = await params
    const body = await req.json()
    const parsed = shipperAddressSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = parsed.data

    const shipment = await db.shipment.findUnique({
      where: { shareCode: code },
      select: {
        id: true,
        type: true,
        status: true,
        shareEnabled: true,
        addressSubmittedAt: true,
        shareLinkExpiresAt: true,
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!shipment.shareEnabled) {
      return NextResponse.json({ error: 'Tracking disabled' }, { status: 403 })
    }

    if (shipment.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Address submission is only available for label dispatches' }, { status: 400 })
    }

    if (shipment.status !== 'PENDING') {
      return NextResponse.json({ error: 'Address can only be submitted for pending dispatches' }, { status: 400 })
    }

    if (shipment.addressSubmittedAt) {
      return NextResponse.json({ error: 'Address has already been submitted' }, { status: 409 })
    }

    if (shipment.shareLinkExpiresAt && new Date() > shipment.shareLinkExpiresAt) {
      return NextResponse.json({ error: 'Share link has expired' }, { status: 410 })
    }

    // Concatenate for legacy single-name destinationName column
    const fullName = `${data.firstName} ${data.lastName}`.trim()
    // Build formatted single-line address for existing UI
    const formatted = [fullName, data.line1, data.line2, data.city, data.state, data.postalCode, getCountryName(data.country)]
      .filter(Boolean)
      .join(', ')

    await db.shipment.update({
      where: { id: shipment.id },
      data: {
        destinationAddress: formatted,
        destinationName: fullName,
        destinationLine1: data.line1,
        destinationLine2: data.line2 || null,
        destinationCity: data.city,
        destinationState: data.state || null,
        destinationPostalCode: data.postalCode,
        destinationCountry: data.country,
        receiverFirstName: data.firstName,
        receiverLastName: data.lastName,
        consigneeEmail: data.email,
        consigneePhone: data.phone || null,
        addressSubmittedAt: new Date(),
      },
    })

    // Fire-and-forget: notify the buyer so they can detect unauthorized changes
    sendDispatchDetailsSubmitted({ shipmentId: shipment.id }).catch((err) => {
      console.error('Failed to send dispatch-details-submitted notification:', err)
    })

    // Fire-and-forget: confirm to the receiver that their address was received
    if (data.email) {
      sendDispatchAddressConfirmedToReceiver({ shipmentId: shipment.id }).catch((err) => {
        console.error('Failed to send dispatch-address-confirmed notification:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting address:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
