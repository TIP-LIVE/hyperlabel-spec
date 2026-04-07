import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canViewAllOrgData } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

/**
 * GET /api/v1/org/default-dispatch-address
 * Returns the org's current default dispatch address (resolved SavedAddress).
 */
export async function GET() {
  try {
    const context = await requireOrgAuth()

    const settings = await db.orgSettings.findUnique({
      where: { orgId: context.orgId },
      select: { defaultDispatchAddressId: true },
    })

    if (!settings?.defaultDispatchAddressId) {
      return NextResponse.json({ address: null })
    }

    const address = await db.savedAddress.findUnique({
      where: { id: settings.defaultDispatchAddressId },
    })

    // Make sure the address is still owned by this org (safety check)
    if (!address || address.orgId !== context.orgId) {
      return NextResponse.json({ address: null })
    }

    return NextResponse.json({ address })
  } catch (error) {
    return handleApiError(error, 'fetching default dispatch address')
  }
}

const updateSchema = z.object({
  savedAddressId: z.string().nullable(),
})

/**
 * POST /api/v1/org/default-dispatch-address
 * Sets (or clears) the org's default dispatch address.
 * Requires org:admin role.
 */
export async function POST(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    if (!canViewAllOrgData(context.orgRole)) {
      return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    // Verify ownership of the saved address before linking
    if (parsed.data.savedAddressId) {
      const address = await db.savedAddress.findUnique({
        where: { id: parsed.data.savedAddressId },
      })
      if (!address || address.orgId !== context.orgId) {
        return NextResponse.json({ error: 'Saved address not found' }, { status: 404 })
      }
    }

    await db.orgSettings.upsert({
      where: { orgId: context.orgId },
      create: {
        orgId: context.orgId,
        defaultDispatchAddressId: parsed.data.savedAddressId,
      },
      update: {
        defaultDispatchAddressId: parsed.data.savedAddressId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'updating default dispatch address')
  }
}
