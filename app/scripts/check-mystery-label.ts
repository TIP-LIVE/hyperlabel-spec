import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  // Check the mystery label that's getting the events
  const labels = await sql`SELECT id, device_id, iccid, imei, status, created_at FROM labels WHERE id LIKE 'cmlrvqma%'`
  console.log('Mystery label:')
  for (const l of labels) {
    console.log(`  id=${l.id} | deviceId=${l.device_id} | iccid=${l.iccid} | imei=${l.imei} | status=${l.status} | created=${l.created_at}`)
  }

  // Check the mystery shipment
  const shipments = await sql`SELECT id, name, status, label_id FROM shipments WHERE id LIKE 'cmm51xmi%'`
  console.log('\nMystery shipment:')
  for (const s of shipments) {
    console.log(`  id=${s.id} | name=${s.name} | status=${s.status} | label_id=${s.label_id}`)

    // Check if this shipment is linked via shipment_labels
    const sls = await sql`SELECT sl.label_id, l.device_id, l.iccid FROM shipment_labels sl JOIN labels l ON l.id = sl.label_id WHERE sl.shipment_id = ${s.id}`
    if (sls.length > 0) {
      console.log('  Linked labels (via shipment_labels):')
      for (const sl of sls) {
        console.log(`    label_id=${String(sl.label_id).slice(0,8)} | deviceId=${sl.device_id} | iccid=${sl.iccid}`)
      }
    }
  }

  // Check the webhook raw body to see what IMEI is being sent
  const recentWh = await sql`
    SELECT id, body FROM webhook_logs
    WHERE iccid = '89457300000038022292'
    ORDER BY created_at DESC LIMIT 1
  `
  if (recentWh[0]) {
    const body = recentWh[0].body as Record<string, unknown>
    console.log('\nLatest webhook body (key fields):')
    console.log(`  iccid: ${body.iccid}`)
    console.log(`  imei: ${body.imei}`)
    console.log(`  sim_label: ${body.sim_label}`)
    console.log(`  type: ${body.type}`)
  }

  // Now check: does processLocationReport look up by IMEI first?
  // Let's see if there's an IMEI match
  const mysteryLabel = labels[0]
  if (mysteryLabel?.imei) {
    console.log(`\nSearching for labels with IMEI=${mysteryLabel.imei}:`)
    const imeiLabels = await sql`SELECT id, device_id, iccid, imei, status FROM labels WHERE imei = ${mysteryLabel.imei}`
    for (const l of imeiLabels) {
      console.log(`  id=${String(l.id).slice(0,8)} | deviceId=${l.device_id} | iccid=${l.iccid} | imei=${l.imei}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
