import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/v1/addresses/[id]/default - Set address as default (or unset)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const existing = await db.savedAddress.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If already default, toggle it off
    if (existing.isDefault) {
      const address = await db.savedAddress.update({
        where: { id },
        data: { isDefault: false },
      })
      return NextResponse.json({ address })
    }

    // Transaction: unset all defaults for this user+org, then set this one
    const address = await db.$transaction(async (tx) => {
      await tx.savedAddress.updateMany({
        where: {
          userId: context.user.id,
          orgId: context.orgId,
          isDefault: true,
        },
        data: { isDefault: false },
      })

      return tx.savedAddress.update({
        where: { id },
        data: { isDefault: true },
      })
    })

    return NextResponse.json({ address })
  } catch (error) {
    return handleApiError(error, 'setting default address')
  }
}
