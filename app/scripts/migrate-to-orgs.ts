/**
 * Migration Script: Add Clerk Organizations to Existing Users
 *
 * This script:
 * 1. Creates a Clerk organization for each existing user
 * 2. Backfills orgId on all their Orders, Shipments, and Notifications
 *
 * Prerequisites:
 * - Clerk Organizations must be enabled in the Clerk Dashboard
 * - CLERK_SECRET_KEY must be set in .env
 *
 * Usage:
 *   npx tsx scripts/migrate-to-orgs.ts
 *
 * After running:
 *   1. Verify all records have orgId set
 *   2. Update prisma/schema.prisma to make orgId non-nullable
 *   3. Run: npx prisma db push
 */

import 'dotenv/config'
import { createClerkClient } from '@clerk/backend'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
})

async function migrateToOrgs() {
  console.log('Starting organization migration...\n')

  // 1. Get all existing users
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${users.length} users to migrate.\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const user of users) {
    try {
      console.log(`Processing user: ${user.email} (${user.id})`)

      // Check if user already has data with orgId set (idempotent)
      const existingOrgOrder = await prisma.order.findFirst({
        where: { userId: user.id, orgId: { not: null } },
        select: { orgId: true },
      })

      if (existingOrgOrder?.orgId) {
        console.log(`  ⏭ Already migrated (orgId: ${existingOrgOrder.orgId}), skipping.`)
        skipCount++
        continue
      }

      // 2. Create an organization for this user in Clerk
      const orgName = user.firstName
        ? `${user.firstName}'s Organization`
        : `${user.email.split('@')[0]}'s Organization`

      const org = await clerk.organizations.createOrganization({
        name: orgName,
        createdBy: user.clerkId,
      })

      console.log(`  ✅ Created org: "${orgName}" (${org.id})`)

      // 3. Backfill orgId on all user's orders
      const ordersUpdated = await prisma.order.updateMany({
        where: { userId: user.id, orgId: null },
        data: { orgId: org.id },
      })
      console.log(`     Updated ${ordersUpdated.count} orders`)

      // 4. Backfill orgId on all user's shipments
      const shipmentsUpdated = await prisma.shipment.updateMany({
        where: { userId: user.id, orgId: null },
        data: { orgId: org.id },
      })
      console.log(`     Updated ${shipmentsUpdated.count} shipments`)

      // 5. Backfill orgId on all user's notifications
      const notificationsUpdated = await prisma.notification.updateMany({
        where: { userId: user.id, orgId: null },
        data: { orgId: org.id },
      })
      console.log(`     Updated ${notificationsUpdated.count} notifications`)

      successCount++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error(`  ❌ Error processing user ${user.email}: ${message}`)
      errorCount++
    }
  }

  console.log('\n============================================')
  console.log('Migration complete!')
  console.log(`  ✅ Migrated: ${successCount}`)
  console.log(`  ⏭ Skipped:  ${skipCount}`)
  console.log(`  ❌ Errors:   ${errorCount}`)
  console.log('============================================')

  if (errorCount === 0) {
    console.log('\nAll users migrated successfully!')
    console.log('Next steps:')
    console.log('  1. Verify data: SELECT count(*) FROM orders WHERE org_id IS NULL;')
    console.log('  2. Update schema: change orgId from String? to String in schema.prisma')
    console.log('  3. Push schema: npx prisma db push')
  } else {
    console.log('\nSome users failed to migrate. Please investigate and re-run.')
  }
}

migrateToOrgs()
  .catch((error) => {
    console.error('Fatal migration error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
