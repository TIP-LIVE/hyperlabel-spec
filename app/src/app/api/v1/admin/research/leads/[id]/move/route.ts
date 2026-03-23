import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { moveLeadSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/v1/admin/research/leads/[id]/move
 * Move a lead to a different pipeline status
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = moveLeadSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchLead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = await db.researchLead.update({
      where: { id },
      data: { status: validated.data.status },
    })

    return NextResponse.json(lead)
  } catch (error) {
    return handleApiError(error, 'moving research lead')
  }
}
