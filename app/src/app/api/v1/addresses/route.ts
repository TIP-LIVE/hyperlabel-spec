import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, orgScopedWhere } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { savedAddressSchema } from '@/lib/validations/address'

/**
 * GET /api/v1/addresses - List saved addresses for current user/org
 */
export async function GET(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('q') || ''

    const where: Record<string, unknown> = {
      ...orgScopedWhere(context),
    }

    if (search) {
      where.OR = [
        { label: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { line1: { contains: search, mode: 'insensitive' } },
      ]
    }

    const addresses = await db.savedAddress.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' },
      ],
    })

    return NextResponse.json({ addresses })
  } catch (error) {
    return handleApiError(error, 'fetching saved addresses')
  }
}

/**
 * POST /api/v1/addresses - Create a new saved address
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    const body = await req.json()
    const validated = savedAddressSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const address = await db.savedAddress.create({
      data: {
        ...validated.data,
        userId: context.user.id,
        orgId: context.orgId,
      },
    })

    return NextResponse.json({ address }, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'creating saved address')
  }
}
