import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

const createOrderSchema = z.object({
  orgId: z.string().min(1, 'Organisation ID is required'),
  quantity: z.number().int().min(1).max(1000),
  totalAmount: z.number().int().min(0).default(0),
  currency: z.string().length(3).default('GBP'),
})

/**
 * POST /api/v1/admin/orders/create
 *
 * Admin: create a PAID order for an organisation without going through Stripe.
 * Used for invoice-based sales (corp clients billed externally) and free samples.
 *
 * The resulting Order provides `quantity` dispatch slots — the existing admin
 * dispatch button (which checks `order.quantity - alreadyDispatched`) will then
 * let the admin create LABEL_DISPATCH shipments on the org's behalf. Labels get
 * linked to dispatches at scan time, so no OrderLabel rows are created here.
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
        status: 'PAID',
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
