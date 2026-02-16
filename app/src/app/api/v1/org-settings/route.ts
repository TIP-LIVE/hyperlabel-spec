import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrgAuth, canViewAllOrgData } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { z } from 'zod'

const updateSchema = z.object({
  allowLabelsInMultipleOrgs: z.boolean().optional(),
})

/**
 * GET /api/v1/org-settings
 * Returns org-level settings for the current organisation (org admin or member can read).
 */
export async function GET() {
  try {
    const context = await requireOrgAuth()

    const row = await db.orgSettings.findUnique({
      where: { orgId: context.orgId },
    })

    return NextResponse.json({
      allowLabelsInMultipleOrgs: row?.allowLabelsInMultipleOrgs ?? false,
    })
  } catch (error) {
    return handleApiError(error, 'fetching org settings')
  }
}

/**
 * PATCH /api/v1/org-settings
 * Update org settings. Only org:admin can update.
 */
export async function PATCH(req: NextRequest) {
  try {
    const context = await requireOrgAuth()

    if (!canViewAllOrgData(context.orgRole)) {
      return NextResponse.json(
        { error: 'Only organisation admins can change these settings' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const data: { allowLabelsInMultipleOrgs?: boolean } = {}
    if (parsed.data.allowLabelsInMultipleOrgs !== undefined) {
      data.allowLabelsInMultipleOrgs = parsed.data.allowLabelsInMultipleOrgs
    }

    if (Object.keys(data).length === 0) {
      const row = await db.orgSettings.findUnique({
        where: { orgId: context.orgId },
      })
      return NextResponse.json({
        allowLabelsInMultipleOrgs: row?.allowLabelsInMultipleOrgs ?? false,
      })
    }

    const row = await db.orgSettings.upsert({
      where: { orgId: context.orgId },
      update: data,
      create: {
        orgId: context.orgId,
        ...data,
      },
    })

    return NextResponse.json({
      allowLabelsInMultipleOrgs: row.allowLabelsInMultipleOrgs,
    })
  } catch (error) {
    return handleApiError(error, 'updating org settings')
  }
}
