import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canAccessRecord } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateSavedAddressSchema } from '@/lib/validations/address'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PUT /api/v1/addresses/[id] - Update a saved address
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = updateSavedAddressSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.savedAddress.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 })
    }
    if (!canAccessRecord(context, existing)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const address = await db.savedAddress.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json({ address })
  } catch (error) {
    return handleApiError(error, 'updating saved address')
  }
}

/**
 * DELETE /api/v1/addresses/[id] - Delete a saved address
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    await db.savedAddress.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting saved address')
  }
}
