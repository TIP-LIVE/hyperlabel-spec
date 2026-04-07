import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { sendDispatchDetailsRequested } from '@/lib/notifications'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const bodySchema = z.object({
  email: z.string().email(),
  note: z.string().max(500).optional().or(z.literal('')),
})

/**
 * POST /api/v1/dispatch/[id]/send-share-link
 *
 * Emails the share link to the given receiver address so they can fill in
 * their delivery details via the public /track/[code] flow.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const context = await requireOrgAuth()
    const { id } = await params

    const shipment = await db.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        shareCode: true,
        addressSubmittedAt: true,
        orgId: true,
        userId: true,
      },
    })

    if (!shipment) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 })
    }

    if (!canAccessRecord(context, { orgId: shipment.orgId, userId: shipment.userId })) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (shipment.type !== 'LABEL_DISPATCH') {
      return NextResponse.json({ error: 'Not a label dispatch' }, { status: 400 })
    }

    if (shipment.addressSubmittedAt) {
      return NextResponse.json(
        { error: 'Receiver details already submitted' },
        { status: 409 },
      )
    }

    const body = await req.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    // Resolve sender name (org name or user name) for the email
    let senderName = `${context.user.firstName ?? ''} ${context.user.lastName ?? ''}`.trim()
    if (!senderName) senderName = context.user.email
    if (context.orgId) {
      try {
        const { createClerkClient } = await import('@clerk/backend')
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
        const org = await clerk.organizations.getOrganization({ organizationId: context.orgId })
        if (org.name) senderName = org.name
      } catch {
        // fall back to user name
      }
    }

    await sendDispatchDetailsRequested({
      receiverEmail: parsed.data.email,
      senderName,
      shareCode: shipment.shareCode,
      note: parsed.data.note || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'sending dispatch share link')
  }
}
