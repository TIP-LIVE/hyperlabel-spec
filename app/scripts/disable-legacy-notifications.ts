import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const before = await db.user.findMany({
    where: {
      OR: [
        { notifyReminders: true },
        { notifyNoSignal: true },
        { notifyShipmentStuck: true },
      ],
    },
    select: {
      id: true,
      email: true,
      notifyReminders: true,
      notifyNoSignal: true,
      notifyShipmentStuck: true,
    },
  })
  console.log(`Users with at least one legacy flag enabled: ${before.length}`)
  for (const u of before) {
    console.log(
      `  ${u.email.padEnd(40)}  reminders=${u.notifyReminders} noSignal=${u.notifyNoSignal} stuck=${u.notifyShipmentStuck}`
    )
  }

  const result = await db.user.updateMany({
    where: {
      OR: [
        { notifyReminders: true },
        { notifyNoSignal: true },
        { notifyShipmentStuck: true },
      ],
    },
    data: {
      notifyReminders: false,
      notifyNoSignal: false,
      notifyShipmentStuck: false,
    },
  })
  console.log(`\nUpdated ${result.count} User rows.`)

  const orgMemberHasFlag = await db.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*)::bigint AS count FROM org_memberships
     WHERE notify_reminders = true OR notify_no_signal = true OR notify_shipment_stuck = true`
  ).catch(() => null)
  if (orgMemberHasFlag && orgMemberHasFlag[0].count > 0n) {
    console.log(
      `\nOrgMembership rows with legacy flag true: ${orgMemberHasFlag[0].count}`
    )
    const orgResult = await db.$executeRawUnsafe(
      `UPDATE org_memberships SET notify_reminders = false, notify_no_signal = false, notify_shipment_stuck = false
       WHERE notify_reminders = true OR notify_no_signal = true OR notify_shipment_stuck = true`
    )
    console.log(`Updated ${orgResult} OrgMembership rows.`)
  } else {
    console.log('\nNo OrgMembership rows with legacy flags enabled.')
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
