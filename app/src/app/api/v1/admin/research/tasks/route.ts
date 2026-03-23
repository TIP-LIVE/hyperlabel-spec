import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { createTaskSchema } from '@/lib/validations/research'

/**
 * GET /api/v1/admin/research/tasks
 * List research tasks with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const leadId = searchParams.get('leadId')
    const limit = parseInt(searchParams.get('limit') || '200', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const where: Record<string, unknown> = {}

    if (status) {
      where.status = status
    }
    if (category) {
      where.category = category
    }
    if (leadId) {
      where.leadId = leadId
    }

    const [tasks, total] = await Promise.all([
      db.researchTask.findMany({
        where,
        include: {
          lead: {
            select: { id: true, name: true, company: true, persona: true },
          },
        },
        orderBy: [
          { status: 'asc' }, // TODO first, then IN_PROGRESS, then DONE
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      db.researchTask.count({ where }),
    ])

    return NextResponse.json({ tasks, total })
  } catch (error) {
    return handleApiError(error, 'fetching research tasks')
  }
}

/**
 * POST /api/v1/admin/research/tasks
 * Create a new research task
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = createTaskSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const task = await db.researchTask.create({
      data: {
        title: validated.data.title,
        category: validated.data.category,
        status: 'TODO',
        ...(validated.data.description && { description: validated.data.description }),
        ...(validated.data.leadId && { leadId: validated.data.leadId }),
        ...(validated.data.dueDate && { dueDate: new Date(validated.data.dueDate) }),
        ...(validated.data.assignee && { assignee: validated.data.assignee }),
      },
      include: {
        lead: {
          select: { id: true, name: true, company: true, persona: true },
        },
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating research task')
  }
}
