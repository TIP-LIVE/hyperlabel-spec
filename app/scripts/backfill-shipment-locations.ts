/**
 * One-time script to backfill orphaned LocationEvents for a shipment.
 * Connects all locations from the shipment's label that have null shipmentId.
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx scripts/backfill-shipment-locations.ts <shipment-id>
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connStr = process.env.DATABASE_URL || ''
const pool = new Pool({
  connectionString: connStr.replace('sslmode=require', 'sslmode=verify-full'),
})
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  const shipmentId = process.argv[2]
  if (!shipmentId) {
    console.error('Usage: npx tsx scripts/backfill-shipment-locations.ts <shipment-id>')
    process.exit(1)
  }

  const shipment = await db.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, name: true, labelId: true, status: true },
  })

  if (!shipment) {
    console.error(`Shipment ${shipmentId} not found`)
    process.exit(1)
  }

  if (!shipment.labelId) {
    console.error(`Shipment ${shipmentId} has no label`)
    process.exit(1)
  }

  console.log(`Shipment: ${shipment.name} (${shipment.id}), status: ${shipment.status}`)
  console.log(`Label ID: ${shipment.labelId}`)

  // Count orphaned locations
  const orphanedCount = await db.locationEvent.count({
    where: { labelId: shipment.labelId, shipmentId: null },
  })
  console.log(`Orphaned locations (null shipmentId): ${orphanedCount}`)

  if (orphanedCount === 0) {
    console.log('No orphaned locations to backfill.')
    return
  }

  // Backfill
  const result = await db.locationEvent.updateMany({
    where: { labelId: shipment.labelId, shipmentId: null },
    data: { shipmentId: shipment.id },
  })

  console.log(`Backfilled ${result.count} locations → shipment ${shipment.id}`)

  // Verify
  const newCount = await db.locationEvent.count({
    where: { shipmentId: shipment.id },
  })
  console.log(`Total locations now on shipment: ${newCount}`)

  await db.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
