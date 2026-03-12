import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

interface RouteParams {
  params: Promise<{ code: string }>
}

/**
 * POST /api/v1/track/[code]/unsubscribe
 * Unsubscribe a consignee from shipment email notifications.
 * Requires `email` query param matching the consignee email on file.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { code } = await params
    const email = req.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
    }

    const shipment = await db.shipment.findUnique({
      where: { shareCode: code },
      select: { id: true, consigneeEmail: true },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (shipment.consigneeEmail?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email does not match' }, { status: 403 })
    }

    await db.shipment.update({
      where: { id: shipment.id },
      data: { consigneeUnsubscribed: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error processing unsubscribe:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
