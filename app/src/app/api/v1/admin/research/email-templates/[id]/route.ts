import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateEmailTemplateSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/email-templates/[id]
 * Fetch a single email template
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const template = await db.researchEmailTemplate.findUnique({
      where: { id },
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    return handleApiError(error, 'fetching email template')
  }
}

/**
 * PATCH /api/v1/admin/research/email-templates/[id]
 * Update an email template (only when DRAFT)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateEmailTemplateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchEmailTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft templates can be edited. Request changes first if the template is in review.' },
        { status: 400 }
      )
    }

    const template = await db.researchEmailTemplate.update({
      where: { id },
      data: validated.data,
    })

    return NextResponse.json(template)
  } catch (error) {
    return handleApiError(error, 'updating email template')
  }
}

/**
 * DELETE /api/v1/admin/research/email-templates/[id]
 * Delete an email template (only DRAFT or ARCHIVED)
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.researchEmailTemplate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'ARCHIVED') {
      return NextResponse.json(
        { error: 'Only draft or archived templates can be deleted' },
        { status: 400 }
      )
    }

    await db.researchEmailTemplate.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting email template')
  }
}
