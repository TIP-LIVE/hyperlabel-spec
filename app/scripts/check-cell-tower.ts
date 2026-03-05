import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  // Find the shipment from the URL
  const shipment = await db.shipment.findFirst({
    where: { id: { startsWith: 'cmmc213z3' } },
    select: { id: true, name: true, labelId: true }
  })
  console.log('Shipment:', shipment)

  if (!shipment) {
    console.log('Shipment not found')
    return
  }

  // Get ALL location events for this shipment
  const events = await db.locationEvent.findMany({
    where: { shipmentId: shipment.id },
    orderBy: { recordedAt: 'desc' },
    select: {
      id: true,
      recordedAt: true,
      receivedAt: true,
      latitude: true,
      longitude: true,
      accuracyM: true,
      batteryPct: true,
      source: true,
      cellLatitude: true,
      cellLongitude: true,
      isOfflineSync: true,
      geocodedCity: true,
      geocodedCountry: true,
    }
  })

  console.log(`\nTotal location events: ${events.length}`)

  const gpsSrc = events.filter(e => e.source === 'GPS')
  const cellSrc = events.filter(e => e.source === 'CELL_TOWER')
  console.log(`  GPS (firmware) source: ${gpsSrc.length}`)
  console.log(`  CELL_TOWER (webhook) source: ${cellSrc.length}`)

  console.log('\nAll events (newest first):')
  console.log('─'.repeat(120))
  console.log('  # | Source      | Recorded At          | Received At          | Lat          | Lng          | Accuracy | Battery | City')
  console.log('─'.repeat(120))

  events.forEach((e, i) => {
    const rec = e.recordedAt.toISOString().replace('T', ' ').slice(0, 19)
    const rcv = e.receivedAt.toISOString().replace('T', ' ').slice(0, 19)
    const src = (e.source || 'GPS').padEnd(10)
    const acc = e.accuracyM ? `${e.accuracyM}m` : 'null'
    const bat = e.batteryPct !== null ? `${e.batteryPct}%` : 'null'
    const city = e.geocodedCity || '-'
    console.log(`${String(i+1).padStart(3)} | ${src} | ${rec} | ${rcv} | ${e.latitude.toFixed(7).padStart(12)} | ${e.longitude.toFixed(7).padStart(12)} | ${acc.padStart(8)} | ${bat.padStart(7)} | ${city}`)
  })

  // Check for distinct coordinates
  const coordSet = new Set(events.map(e => `${e.latitude.toFixed(5)},${e.longitude.toFixed(5)}`))
  console.log(`\nDistinct coordinate positions: ${coordSet.size}`)
  coordSet.forEach(c => console.log(`  ${c}`))

  // Time gaps between consecutive events
  console.log('\nTime gaps between events:')
  for (let i = 0; i < events.length - 1; i++) {
    const gap = (events[i].recordedAt.getTime() - events[i+1].recordedAt.getTime()) / 1000 / 60
    const src = events[i].source || 'GPS'
    console.log(`  ${events[i].recordedAt.toISOString().slice(11,19)} → ${events[i+1].recordedAt.toISOString().slice(11,19)}: ${gap.toFixed(0)} min (${src})`)
  }
}

main().finally(() => { db.$disconnect(); pool.end() })
