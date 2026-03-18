import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const tip001LabelId = 'c908eafc-7e42-4185-9f41-610184ad9a8e'
  const tip005LabelId = 'cmlrvqma2000204jub0tj4erh'
  const shipment001 = 'a4bd0a8f-49eb-4bc7-aecd-350d997f7088'
  const shipment005 = 'cmm51xmim000104latltc23u0'

  // Last event for TIP-001's shipment
  const lastTip001 = await sql`
    SELECT id, recorded_at, received_at, source, geocoded_city
    FROM location_events
    WHERE shipment_id = ${shipment001}
    ORDER BY recorded_at DESC LIMIT 5
  `
  console.log('Last 5 events for TIP-001 shipment:')
  for (const r of lastTip001) {
    console.log(`  ${r.recorded_at} | source=${r.source} | city=${r.geocoded_city}`)
  }

  // First event for TIP-005's shipment
  const firstTip005 = await sql`
    SELECT id, recorded_at, received_at, source, geocoded_city
    FROM location_events
    WHERE shipment_id = ${shipment005}
    ORDER BY recorded_at ASC LIMIT 5
  `
  console.log('\nFirst 5 events for TIP-005 shipment:')
  for (const r of firstTip005) {
    console.log(`  ${r.recorded_at} | source=${r.source} | city=${r.geocoded_city}`)
  }

  // When did TIP-005 shipment start getting CELL_TOWER events?
  const firstCellTip005 = await sql`
    SELECT id, recorded_at, received_at, source, geocoded_city
    FROM location_events
    WHERE shipment_id = ${shipment005} AND source = 'CELL_TOWER'
    ORDER BY recorded_at ASC LIMIT 3
  `
  console.log('\nFirst CELL_TOWER events on TIP-005 shipment (these should be on TIP-001):')
  for (const r of firstCellTip005) {
    console.log(`  ${r.recorded_at} | source=${r.source} | city=${r.geocoded_city}`)
  }

  // Total misrouted events
  const misroutedCount = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE shipment_id = ${shipment005} AND source = 'CELL_TOWER'`
  console.log(`\nTotal CELL_TOWER events misrouted to TIP-005: ${misroutedCount[0].cnt}`)

  // Total events per shipment by source
  for (const [name, sid] of [['TIP-001', shipment001], ['TIP-005', shipment005]]) {
    const bySource = await sql`
      SELECT source, COUNT(*)::int as cnt
      FROM location_events
      WHERE shipment_id = ${sid}
      GROUP BY source
    `
    console.log(`\n${name} shipment events by source:`)
    for (const r of bySource) {
      console.log(`  ${r.source}: ${r.cnt}`)
    }
  }

  // When was TIP-005 shipment created?
  const tip005Shipment = await sql`SELECT created_at, name, status FROM shipments WHERE id = ${shipment005}`
  console.log('\nTIP-005 shipment created:', tip005Shipment[0]?.created_at)
}

main().catch(e => { console.error(e); process.exit(1) })
