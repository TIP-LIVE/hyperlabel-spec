import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const labelId = 'c908eafc-7e42-4185-9f41-610184ad9a8e'
  const shipmentId = 'a4bd0a8f-49eb-4bc7-aecd-350d997f7088'

  const prefixes = ['cmmujyt8','cmmujx9l','cmmufoyt','cmmufneo','cmmubdc2','cmmu74xs','cmmu73hw','cmmu2tg6','cmmtyk7q','cmmtubdy','cmmtlqb0','cmmtlq2n','cmmthhz9','cmmthhr8','cmmtd7mt','cmmtd6bn','cmmtd63g']

  console.log('Checking label_id and shipment_id for webhook-created locations:')
  for (const prefix of prefixes) {
    const rows = await sql`SELECT id, label_id, shipment_id FROM location_events WHERE id LIKE ${prefix + '%'} LIMIT 1`
    if (rows[0]) {
      const r = rows[0]
      const labelMatch = r.label_id === labelId ? 'OK' : `MISMATCH (${String(r.label_id).slice(0,8)})`
      const shipmentMatch = r.shipment_id === shipmentId ? 'OK' : r.shipment_id ? `MISMATCH (${String(r.shipment_id).slice(0,8)})` : 'NULL'
      console.log(`${String(r.id).slice(0,8)} | label=${labelMatch} | shipment=${shipmentMatch}`)
    }
  }

  // Count total location events for this label in last 24h using different time field
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const byRecorded = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE label_id = ${labelId} AND recorded_at >= ${since}::timestamptz`
  const byReceived = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE label_id = ${labelId} AND received_at >= ${since}::timestamptz`

  console.log('\nCount by recorded_at (24h):', byRecorded[0].cnt)
  console.log('Count by received_at (24h):', byReceived[0].cnt)

  // Check the single event that DID show up
  const theOne = await sql`SELECT id, recorded_at, received_at, source FROM location_events WHERE label_id = ${labelId} AND recorded_at >= ${since}::timestamp ORDER BY recorded_at DESC LIMIT 5`
  console.log('\nThe events matching label_id + recorded_at >= since:')
  for (const r of theOne) {
    console.log(`  ${String(r.id).slice(0,8)} | recorded=${r.recorded_at} | received=${r.received_at} | source=${r.source}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
