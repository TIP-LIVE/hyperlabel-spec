/**
 * One-off backfill: flip all existing staff users (role=admin OR email in
 * ADMIN_EMAILS) to digestCadence=OFF. Matches the default applied to new
 * staff users in the Clerk webhook. Safe to re-run — idempotent.
 *
 * Usage: npx tsx scripts/backfill-staff-digest-off.ts
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}
const adapter = new PrismaNeon({ connectionString })
const db = new PrismaClient({ adapter })

async function main() {
  const adminEmailsEnv = process.env.ADMIN_EMAILS ?? ''
  const adminEmails = adminEmailsEnv
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  console.log(
    `Staff detection: role=admin OR email in [${adminEmails.join(', ')}]`
  )

  const candidates = await db.user.findMany({
    where: {
      OR: [
        { role: 'admin' },
        ...(adminEmails.length > 0 ? [{ email: { in: adminEmails } }] : []),
      ],
    },
    select: {
      id: true,
      email: true,
      role: true,
      digestCadence: true,
    },
  })

  console.log(`Found ${candidates.length} staff user(s):`)
  for (const u of candidates) {
    console.log(
      `  ${u.email} (role=${u.role}, digestCadence=${u.digestCadence})`
    )
  }

  const toUpdate = candidates.filter((u) => u.digestCadence !== 'OFF')
  if (toUpdate.length === 0) {
    console.log('\nNothing to update — all staff already OFF.')
    return
  }

  const result = await db.user.updateMany({
    where: { id: { in: toUpdate.map((u) => u.id) } },
    data: { digestCadence: 'OFF' },
  })

  console.log(
    `\nUpdated ${result.count} user(s) to digestCadence=OFF.`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
