import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { updateTaskSchema } from '@/lib/validations/research'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/admin/research/tasks/[id]
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const task = await db.researchTask.findUnique({
      where: { id },
      include: {
        lead: {
          select: { id: true, name: true, company: true, persona: true },
        },
      },
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)
  } catch (error) {
    return handleApiError(error, 'fetching research task')
  }
}

/**
 * PATCH /api/v1/admin/research/tasks/[id]
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const body = await req.json()
    const validated = updateTaskSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.researchTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = { ...validated.data }

    // Convert dueDate string to Date
    if (typeof data.dueDate === 'string') {
      data.dueDate = new Date(data.dueDate as string)
    }

    const task = await db.researchTask.update({
      where: { id },
      data,
      include: {
        lead: {
          select: { id: true, name: true, company: true, persona: true },
        },
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    return handleApiError(error, 'updating research task')
  }
}

/**
 * DELETE /api/v1/admin/research/tasks/[id]
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin()
    const { id } = await params

    const existing = await db.researchTask.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db.researchTask.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'deleting research task')
  }
}
