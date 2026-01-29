import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { z } from 'zod'

const preferencesSchema = z.object({
  notifyLabelActivated: z.boolean().optional(),
  notifyLowBattery: z.boolean().optional(),
  notifyNoSignal: z.boolean().optional(),
  notifyDelivered: z.boolean().optional(),
  notifyOrderShipped: z.boolean().optional(),
})

/**
 * GET /api/v1/user/preferences
 * Get current user's notification preferences
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const prefs = await db.user.findUnique({
      where: { id: user.id },
      select: {
        notifyLabelActivated: true,
        notifyLowBattery: true,
        notifyNoSignal: true,
        notifyDelivered: true,
        notifyOrderShipped: true,
      },
    })

    return NextResponse.json({ preferences: prefs })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/user/preferences
 * Update notification preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await req.json()
    const validated = preferencesSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: validated.data,
      select: {
        notifyLabelActivated: true,
        notifyLowBattery: true,
        notifyNoSignal: true,
        notifyDelivered: true,
        notifyOrderShipped: true,
      },
    })

    return NextResponse.json({ preferences: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
