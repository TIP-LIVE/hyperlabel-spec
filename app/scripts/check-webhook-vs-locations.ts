import { neon } from '@neondatabase/serverless'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL not set')
const sql = neon(connectionString)

async function main() {
  // Find label TIP-001
  const labels = await sql`SELECT id, device_id, iccid FROM labels WHERE device_id = 'TIP-001' LIMIT 1`
  const label = labels[0]
  console.log('Label:', JSON.stringify(label))
  if (!label) { console.log('Not found'); return }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Webhook logs in last 24h
  const whCount = await sql`SELECT COUNT(*)::int as cnt FROM webhook_logs WHERE iccid = ${label.iccid} AND created_at >= ${since}::timestamp`
  console.log('Webhook logs (24h):', whCount[0].cnt)

  // Location events in last 24h
  const locCount = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE label_id = ${label.id} AND recorded_at >= ${since}::timestamp`
  console.log('Location events for label (24h):', locCount[0].cnt)

  // Active shipment
  const shipments = await sql`SELECT id, status, name FROM shipments WHERE label_id = ${label.id} AND status IN ('PENDING', 'IN_TRANSIT') LIMIT 1`
  const shipment = shipments[0]
  console.log('Active shipment:', JSON.stringify(shipment))

  if (shipment) {
    const linkedCount = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE shipment_id = ${shipment.id} AND recorded_at >= ${since}::timestamp`
    console.log('Location events linked to shipment (24h):', linkedCount[0].cnt)

    const unlinkedCount = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE label_id = ${label.id} AND shipment_id IS NULL AND recorded_at >= ${since}::timestamp`
    console.log('Unlinked location events (24h):', unlinkedCount[0].cnt)

    const totalLinked = await sql`SELECT COUNT(*)::int as cnt FROM location_events WHERE shipment_id = ${shipment.id}`
    console.log('Total location events for shipment (all time):', totalLinked[0].cnt)
  }

  // Recent location events
  const recentLocs = await sql`
    SELECT id, recorded_at, received_at, source, shipment_id, geocoded_city, latitude, longitude
    FROM location_events
    WHERE label_id = ${label.id} AND recorded_at >= ${since}::timestamp
    ORDER BY recorded_at DESC
  `
  console.log('\nRecent location events (last 24h):')
  for (const loc of recentLocs) {
    console.log(` ${loc.recorded_at} | source=${loc.source || 'GPS'} | shipment=${loc.shipment_id ? String(loc.shipment_id).slice(0, 8) : 'NULL'} | city=${loc.geocoded_city || 'none'} | id=${String(loc.id).slice(0, 8)}`)
  }

  // Recent webhook logs
  const recentWh = await sql`
    SELECT id, created_at, endpoint, event_type, status_code, processing_result
    FROM webhook_logs
    WHERE iccid = ${label.iccid} AND created_at >= ${since}::timestamp
    ORDER BY created_at DESC
  `
  console.log('\nRecent webhook logs (last 24h):')
  for (const wh of recentWh) {
    const result = wh.processing_result as Record<string, unknown> | null
    const locId = result?.locationId ? String(result.locationId).slice(0, 8) : 'none'
    const extra = result?.skipped ? `SKIPPED: ${result.reason}` : result?.deduplicated ? 'DEDUPED' : ''
    console.log(` ${wh.created_at} | ${wh.endpoint} | ${wh.event_type || '-'} | status=${wh.status_code} | locId=${locId} ${extra}`)
  }

  // Check if webhook locationIds match actual location_events
  const whLocationIds = recentWh
    .map(wh => (wh.processing_result as any)?.locationId)
    .filter(Boolean)

  if (whLocationIds.length > 0) {
    const existing = await sql`SELECT id FROM location_events WHERE id = ANY(${whLocationIds})`
    const existingIds = new Set(existing.map(e => e.id))
    const missing = whLocationIds.filter((id: string) => !existingIds.has(id))
    console.log(`\nWebhook locationIds: ${whLocationIds.length}, Found in DB: ${existingIds.size}, Missing: ${missing.length}`)
    if (missing.length > 0) {
      console.log('MISSING locationIds:', missing.map((id: string) => id.slice(0, 8)))
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
