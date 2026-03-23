import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateLeadSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/leads/[id]
 * Fetch a single research lead with tasks
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const lead = await db.researchLead.findUnique({
      where: { id },
      include: {
        tasks: { orderBy: { createdAt: 'desc' } },
        emailLogs: { orderBy: { sentAt: 'desc' } },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json(lead)
  } catch (error) {
    return handleApiError(error, 'fetching research lead')
  }
}

/**
 * PATCH /api/v1/admin/research/leads/[id]
 * Update a research lead
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateLeadSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    // Check lead exists
    const existing = await db.researchLead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Clean empty strings to null for optional fields
    const data = { ...validated.data }
    const optionalFields = ['email', 'linkedIn', 'company', 'role', 'source', 'referredBy', 'screeningNotes', 'giftCardType'] as const
    for (const field of optionalFields) {
      if (field in data && (data as Record<string, unknown>)[field] === '') {
        (data as Record<string, unknown>)[field] = null
      }
    }

    const lead = await db.researchLead.update({
      where: { id },
      data,
    })

    return NextResponse.json(lead)
  } catch (error) {
    return handleApiError(error, 'updating research lead')
  }
}

/**
 * DELETE /api/v1/admin/research/leads/[id]
 * Delete a research lead
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.researchLead.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    await db.researchLead.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting research lead')
  }
}
