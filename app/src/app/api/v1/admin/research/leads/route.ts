import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createLeadSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/leads
 * List research leads with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const persona = searchParams.get('persona')
    const q = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '200', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (persona) {
      where.persona = persona
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { company: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [leads, total] = await Promise.all([
      db.researchLead.findMany({
        where,
        include: {
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.researchLead.count({ where }),
    ])

    return NextResponse.json({ leads, pagination: { total, limit, offset } })
  } catch (error) {
    return handleApiError(error, 'listing research leads')
  }
}

/**
 * POST /api/v1/admin/research/leads
 * Create a new research lead
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = createLeadSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    // Clean empty strings to null
    const data = { ...validated.data }
    const optionalFields = ['email', 'linkedIn', 'company', 'role', 'source', 'referredBy', 'screeningNotes'] as const
    for (const field of optionalFields) {
      if (data[field] === '') {
        (data as Record<string, unknown>)[field] = null
      }
    }

    const lead = await db.researchLead.create({
      data: {
        name: data.name,
        email: data.email || null,
        linkedIn: data.linkedIn || null,
        company: data.company || null,
        role: data.role || null,
        persona: data.persona,
        source: data.source || null,
        referredBy: data.referredBy || null,
        screeningNotes: data.screeningNotes || null,
        pilotInterest: data.pilotInterest ?? null,
      },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating research lead')
  }
}
