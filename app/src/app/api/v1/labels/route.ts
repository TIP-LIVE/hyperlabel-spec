import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isClerkConfigured } from '@/lib/clerk-config'

/**
 * GET /api/v1/labels - List user's labels
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user && isClerkConfigured()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    // Build where clause - labels owned by user through orders
    const where: Record<string, unknown> = {
      order: {
        ...(user && { userId: user.id }),
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED'] },
      },
    }

    if (status) {
      where.status = status
    }

    const labels = await db.label.findMany({
      where,
      select: {
        id: true,
        deviceId: true,
        status: true,
        batteryPct: true,
        activatedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ labels })
  } catch (error) {
    console.error('Error fetching labels:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
