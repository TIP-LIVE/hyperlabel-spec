/**
 * One-off backfill for labels that predate the NNNNNYYYY spec (see
 * docs/DEVICE-LOCATION-SYSTEM.md). Only touches labels that have a LIVE
 * shipment (PENDING or IN_TRANSIT) — archived stock is left alone.
 *
 * YYYY is sourced in this order of preference:
 *   1. last 4 digits of IMEI   (spec)
 *   2. last 4 digits of ICCID  (legacy extension — tagged synthetic)
 *   3. last 4 digits of deviceId numeric portion (fallback of last resort)
 *
 * Run with --apply to persist. Default is dry-run.
 *
 *   DATABASE_URL=... node scripts/backfill-legacy-display-ids.mjs           # dry-run
 *   DATABASE_URL=... node scripts/backfill-legacy-display-ids.mjs --apply   # writes
 */
import ws from 'ws'
import { neon, neonConfig } from '@neondatabase/serverless'

neonConfig.webSocketConstructor = ws
const sql = neon(process.env.DATABASE_URL)

const apply = process.argv.includes('--apply')

function last4From(label) {
  if (label.imei && label.imei.length >= 4) return { source: 'imei', yyyy: label.imei.slice(-4) }
  if (label.iccid && label.iccid.length >= 4) return { source: 'iccid', yyyy: label.iccid.slice(-4) }
  const digits = label.device_id.replace(/\D/g, '')
  if (digits.length >= 4) return { source: 'deviceId-digits', yyyy: digits.slice(-4) }
  return null
}

// Find labels with no displayId that have a live shipment.
const targets = await sql`
  SELECT l.id, l.device_id, l.display_id, l.imei, l.iccid, l.counter, l.status
  FROM labels l
  WHERE l.display_id IS NULL
    AND EXISTS (
      SELECT 1 FROM shipments s
      WHERE s.label_id = l.id AND s.status IN ('PENDING', 'IN_TRANSIT')
    )
  ORDER BY l.created_at ASC
`

if (targets.length === 0) {
  console.log('No legacy labels with live shipments. Nothing to do.')
  process.exit(0)
}

console.log(`Found ${targets.length} label(s) needing backfill:`)

// Peek at the highest existing counter so we know where to start allocating.
const counterMax = await sql`SELECT COALESCE(MAX(counter), 0) AS max FROM labels`
let nextCounter = Number(counterMax[0].max) + 1

const plan = []
for (const label of targets) {
  const yyyy = last4From(label)
  if (!yyyy) {
    console.log(`  SKIP ${label.device_id}: no usable source for YYYY (no imei/iccid/digits)`)
    continue
  }
  const counter = label.counter ?? nextCounter++
  const nnnnn = String(counter).padStart(5, '0')
  const displayId = `${nnnnn}${yyyy.yyyy}`
  plan.push({ ...label, newCounter: counter, newDisplayId: displayId, yyyySource: yyyy.source })
  console.log(
    `  ${label.device_id.padEnd(20)} → counter=${counter} displayId=${displayId}  (YYYY from ${yyyy.source})`
  )
}

if (!apply) {
  console.log()
  console.log('Dry run. Rerun with --apply to persist these changes.')
  process.exit(0)
}

console.log()
console.log('Applying...')
for (const row of plan) {
  // Collision guard: a real production label might already own the same 9-digit
  // string. Very unlikely (different counter + different last-4) but check.
  const clash = await sql`SELECT id FROM labels WHERE display_id = ${row.newDisplayId}`
  if (clash.length > 0) {
    console.log(`  SKIP ${row.device_id}: displayId ${row.newDisplayId} already taken by ${clash[0].id}`)
    continue
  }
  await sql`
    UPDATE labels
    SET counter = ${row.newCounter}, display_id = ${row.newDisplayId}
    WHERE id = ${row.id} AND display_id IS NULL
  `
  console.log(`  OK   ${row.device_id} → ${row.newDisplayId}`)
}
console.log('Done.')
