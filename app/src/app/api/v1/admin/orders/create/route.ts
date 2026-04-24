import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

const createOrderSchema = z.object({
  orgId: z.string().min(1, 'Organisation ID is required'),
  quantity: z.number().int().min(1).max(1000),
  totalAmount: z.number().int().min(0),
  currency: z.string().length(3).default('GBP'),
})

/**
 * POST /api/v1/admin/orders/create
 *
 * Admin: create a PENDING invoice for an organisation, paid outside Stripe.
 * Supports both paid invoices (amount > 0) and free samples (amount = 0)
 * where we ship labels to a prospect for testing. Admin flips the order PAID
 * via /api/v1/admin/orders/[id]/mark-paid once the payment lands (or
 * immediately for free samples) — that's when labels get allocated and
 * dispatch capacity opens up.
 *
 * This path sets source=INVOICE so the dispatch-quota filter counts its
 * `quantity` as purchased capacity regardless of amount. Label-registration
 * flows (source=LABELS_REGISTER) still don't grant capacity.
 */
export async function POST(req: NextRequest) {
  try {
    const adminUser = await requireAdmin()

    const body = await req.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { orgId, quantity, totalAmount, currency } = parsed.data

    // Prefer an existing org user as the order owner so the order appears under
    // that user's history; fall back to the admin when the org has no users yet
    // (mirrors /api/v1/admin/labels/register behaviour).
    const existingOrder = await db.order.findFirst({
      where: { orgId },
      select: { userId: true },
    })
    const userId = existingOrder?.userId ?? adminUser.id

    const order = await db.order.create({
      data: {
        userId,
        orgId,
        status: 'PENDING',
        source: 'INVOICE',
        totalAmount,
        currency,
        quantity,
      },
    })

    return NextResponse.json({ success: true, order }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'admin create order')
  }
}
