import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Fetch legacy notifications created today with full detail
  console.log('\n=== Legacy notifications today with full metadata ===')
  const legacy = await db.notification.findMany({
    where: {
      sentAt: { gte: oneDayAgo },
      type: {
        in: [
          'pending_shipment_reminder',
          'unused_label_reminder',
          'no_signal',
          'shipment_stuck',
        ],
      },
    },
    orderBy: { sentAt: 'asc' },
    select: {
      id: true,
      type: true,
      sentAt: true,
      userId: true,
      orgId: true,
      message: true,
    },
  })
  for (const n of legacy) {
    console.log(
      `${n.sentAt.toISOString()} id=${n.id} type=${n.type} user=${n.userId.slice(-8)} org=${n.orgId ?? 'null'}`
    )
    console.log(`  message: ${n.message}`)
  }

  // Also check: what users got these. Pull their emails.
  const userIds = [...new Set(legacy.map((n) => n.userId))]
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, email: true, digestCadence: true, notifyReminders: true, notifyNoSignal: true, notifyShipmentStuck: true },
  })
  console.log('\n=== Affected users ===')
  for (const u of users) {
    console.log(
      `${u.id.slice(-8)}  email=${u.email}  digestCadence=${u.digestCadence}  notifyReminders=${u.notifyReminders}  notifyNoSignal=${u.notifyNoSignal}  notifyShipmentStuck=${u.notifyShipmentStuck}`
    )
  }

  // Also check: are there other "type" values I might have missed that were created recently?
  console.log('\n=== All notification types in last 48h ===')
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const allTypes = await db.notification.groupBy({
    by: ['type'],
    where: { sentAt: { gte: twoDaysAgo } },
    _count: true,
    _min: { sentAt: true },
    _max: { sentAt: true },
  })
  for (const t of allTypes) {
    console.log(
      `${t.type.padEnd(40)}  count=${t._count}  first=${t._min.sentAt?.toISOString()}  last=${t._max.sentAt?.toISOString()}`
    )
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
