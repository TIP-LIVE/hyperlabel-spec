import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createEmailTemplateSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/email-templates
 * List email templates with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    if (type) where.type = type
    if (status) where.status = status

    const templates = await db.researchEmailTemplate.findMany({
      where,
      orderBy: [{ type: 'asc' }, { persona: 'asc' }],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    return handleApiError(error, 'listing email templates')
  }
}

/**
 * POST /api/v1/admin/research/email-templates
 * Create a new email template
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = createEmailTemplateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const template = await db.researchEmailTemplate.create({
      data: {
        type: validated.data.type,
        persona: validated.data.persona ?? null,
        subject: validated.data.subject,
        body: validated.data.body,
        status: 'DRAFT',
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating email template')
  }
}
