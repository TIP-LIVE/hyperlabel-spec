import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  const iccid = '89457300000038022292'

  // Find all labels with this ICCID
  const labels = await sql`SELECT id, device_id, iccid, status, created_at FROM labels WHERE iccid = ${iccid} ORDER BY created_at`
  console.log(`Labels with ICCID ${iccid}:`)
  for (const l of labels) {
    console.log(`  id=${String(l.id).slice(0,8)} | deviceId=${l.device_id} | status=${l.status} | created=${l.created_at}`)
  }

  // Check shipments for each label
  for (const l of labels) {
    const shipments = await sql`SELECT id, name, status, label_id FROM shipments WHERE label_id = ${l.id} ORDER BY created_at DESC LIMIT 3`
    console.log(`\nShipments for label ${l.device_id} (${String(l.id).slice(0,8)}):`)
    for (const s of shipments) {
      const locCount = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE shipment_id = ${s.id}`
      console.log(`  id=${String(s.id).slice(0,8)} | name=${s.name} | status=${s.status} | locations=${locCount[0].cnt}`)
    }
  }

  // Check which label processLocationReport would pick
  // It uses: findFirst where iccid = X, include active shipments
  console.log('\n--- Simulating processLocationReport label lookup ---')
  const labelWithShipment = await sql`
    SELECT l.id as label_id, l.device_id, s.id as shipment_id, s.name as shipment_name, s.status as shipment_status
    FROM labels l
    LEFT JOIN shipments s ON s.label_id = l.id AND s.status IN ('PENDING', 'IN_TRANSIT')
    WHERE l.iccid = ${iccid}
    ORDER BY l.created_at
  `
  console.log('Labels with active shipments:')
  for (const r of labelWithShipment) {
    console.log(`  label=${r.device_id} (${String(r.label_id).slice(0,8)}) | shipment=${r.shipment_id ? String(r.shipment_id).slice(0,8) : 'NONE'} ${r.shipment_name || ''} | status=${r.shipment_status || 'N/A'}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
