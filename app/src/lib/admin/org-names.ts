import { createClerkClient } from '@clerk/backend'

/**
 * Fetch all Clerk org names into a lookup map.
 * Used across admin pages to display org names from orgId strings.
 */
export async function getOrgNamesMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })
    const { data: orgs } = await clerk.organizations.getOrganizationList({ limit: 100 })
    for (const org of orgs) {
      map[org.id] = org.name
    }
  } catch (err) {
    console.error('[getOrgNamesMap] Clerk error:', err)
  }
  return map
}
