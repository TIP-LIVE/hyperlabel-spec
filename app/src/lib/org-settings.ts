import { db } from '@/lib/db'

const PAID_ORDER_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED'] as const

/**
 * Get org setting: allow labels to be in multiple organisations.
 * When true, user/org can add a label even if it's already in another org.
 */
export async function getAllowLabelsInMultipleOrgs(orgId: string): Promise<boolean> {
  const row = await db.orgSettings.findUnique({
    where: { orgId },
    select: { allowLabelsInMultipleOrgs: true },
  })
  return row?.allowLabelsInMultipleOrgs ?? false
}

/**
 * Build Prisma filter for "labels that belong to this org" (via OrderLabel).
 */
export function labelInOrgOrderFilter(orgId: string, orderStatuses: readonly string[] = PAID_ORDER_STATUSES) {
  return {
    orderLabels: {
      some: {
        order: {
          orgId,
          status: { in: [...orderStatuses] },
        },
      },
    },
  }
}

/**
 * Check if a label is linked to any order in the given org.
 */
export async function isLabelInOrg(labelId: string, orgId: string): Promise<boolean> {
  const count = await db.orderLabel.count({
    where: {
      labelId,
      order: { orgId, status: { in: [...PAID_ORDER_STATUSES] } },
    },
  })
  return count > 0
}

/**
 * Check if a label is linked to any order in another org (not this one).
 */
export async function isLabelInOtherOrg(labelId: string, excludeOrgId: string): Promise<boolean> {
  const count = await db.orderLabel.count({
    where: {
      labelId,
      order: {
        orgId: { not: excludeOrgId },
        status: { in: [...PAID_ORDER_STATUSES] },
      },
    },
  })
  return count > 0
}
