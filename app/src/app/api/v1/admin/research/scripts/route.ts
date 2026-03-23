import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createScriptSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/scripts
 * List research scripts with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const persona = searchParams.get('persona')

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (persona) {
      where.persona = persona
    }

    const scripts = await db.researchScript.findMany({
      where,
      orderBy: [{ persona: 'asc' }, { version: 'desc' }],
    })

    return NextResponse.json({ scripts })
  } catch (error) {
    return handleApiError(error, 'listing research scripts')
  }
}

/**
 * POST /api/v1/admin/research/scripts
 * Create a new research script
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = createScriptSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const script = await db.researchScript.create({
      data: {
        title: validated.data.title,
        persona: validated.data.persona,
        sections: validated.data.sections,
        status: 'DRAFT',
      },
    })

    return NextResponse.json(script, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating research script')
  }
}
