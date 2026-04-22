/**
 * Sync every SIM label on Onomondo to the 9-digit displayId format
 * (5-digit counter + last-4 of IMEI), matching what commit e6f7a91 now
 * writes for newly auto-registered labels.
 *
 * For each label in our DB with an ICCID:
 *   - If displayId is set, push that.
 *   - Else if counter + IMEI are both present, compute displayId, backfill
 *     it on the Label row, and push.
 *   - Else skip (we can't compute without IMEI — those get renamed the
 *     next time they report and the IMEI-backfill path fires).
 *
 * The actual Onomondo PATCH is skipped if the current SIM label already
 * matches, so re-running is cheap.
 *
 * Usage:
 *   npx tsx scripts/sync-onomondo-labels.ts          # dry-run
 *   npx tsx scripts/sync-onomondo-labels.ts --apply  # push to Onomondo
 */

import 'dotenv/config'
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import { formatDisplayId } from '@/lib/label-id'

// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const ONOMONDO_API_BASE = 'https://api.onomondo.com'
const APPLY = process.argv.includes('--apply')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}
const apiKey = process.env.ONOMONDO_API_KEY
if (APPLY && !apiKey) {
  console.error('ONOMONDO_API_KEY is required for --apply')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

async function setSimLabel(
  iccid: string,
  newLabel: string,
): Promise<'updated' | 'already_set' | 'not_found' | 'error'> {
  const headers = {
    Authorization: apiKey!,
    'Content-Type': 'application/json',
  }

  const searchRes = await fetch(
    `${ONOMONDO_API_BASE}/sims/find?search=${encodeURIComponent(iccid)}&limit=1`,
    { headers },
  )
  if (!searchRes.ok) {
    console.error(`  ✗ search ${iccid}: HTTP ${searchRes.status}`)
    return 'error'
  }
  const sims = await searchRes.json()
  if (!Array.isArray(sims) || sims.length === 0) return 'not_found'

  const simId = sims[0].id
  const currentLabel = sims[0].label
  if (currentLabel === newLabel) return 'already_set'

  const patchRes = await fetch(`${ONOMONDO_API_BASE}/sims/${simId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ label: newLabel }),
  })
  if (!patchRes.ok) {
    console.error(`  ✗ patch ${simId}: HTTP ${patchRes.status}`)
    return 'error'
  }
  return 'updated'
}

async function main() {
  // All labels with ICCID — not only TIP-XXX, because some legacy labels
  // could have any deviceId but still benefit from a 9-digit Onomondo label.
  const labels = await prisma.label.findMany({
    where: { iccid: { not: null } },
    select: {
      id: true,
      deviceId: true,
      displayId: true,
      counter: true,
      imei: true,
      iccid: true,
    },
    orderBy: { counter: 'asc' },
  })

  console.log(`Found ${labels.length} labels with ICCID.\n`)

  const plan: {
    id: string
    deviceId: string
    iccid: string
    newLabel: string
    backfillDisplayId: boolean
  }[] = []
  const skipped: { deviceId: string; reason: string }[] = []

  for (const l of labels) {
    if (l.displayId) {
      plan.push({
        id: l.id,
        deviceId: l.deviceId,
        iccid: l.iccid!,
        newLabel: l.displayId,
        backfillDisplayId: false,
      })
      continue
    }
    const computed =
      l.counter != null && l.imei ? formatDisplayId(l.counter, l.imei) : null
    if (!computed) {
      const missing: string[] = []
      if (l.counter == null) missing.push('counter')
      if (!l.imei) missing.push('imei')
      skipped.push({ deviceId: l.deviceId, reason: `missing ${missing.join('+')}` })
      continue
    }
    plan.push({
      id: l.id,
      deviceId: l.deviceId,
      iccid: l.iccid!,
      newLabel: computed,
      backfillDisplayId: true,
    })
  }

  console.log(`Eligible: ${plan.length}`)
  for (const r of plan) {
    const flag = r.backfillDisplayId ? ' (backfill displayId)' : ''
    console.log(`  ${r.deviceId}  →  ${r.newLabel}   iccid=${r.iccid}${flag}`)
  }
  if (skipped.length > 0) {
    console.log(`\nSkipped: ${skipped.length}`)
    for (const s of skipped) console.log(`  ${s.deviceId}  (${s.reason})`)
  }

  if (plan.length === 0) return
  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to push to Onomondo.')
    return
  }

  console.log('\nApplying...')
  const counts = { updated: 0, already_set: 0, not_found: 0, error: 0 }
  for (const r of plan) {
    try {
      if (r.backfillDisplayId) {
        await prisma.label.update({
          where: { id: r.id },
          data: { displayId: r.newLabel },
        })
      }
      const result = await setSimLabel(r.iccid, r.newLabel)
      counts[result]++
      const mark =
        result === 'updated'
          ? '✓ updated'
          : result === 'already_set'
            ? '· already'
            : result === 'not_found'
              ? '⚠ not on Onomondo'
              : '✗ error'
      console.log(`  ${mark}  ${r.deviceId} → ${r.newLabel}`)
    } catch (err) {
      counts.error++
      console.error(`  ✗ ${r.deviceId} → ${r.newLabel}:`, (err as Error).message)
    }
    await new Promise((r) => setTimeout(r, 200)) // rate-limit buffer
  }
  console.log(
    `\nDone. updated=${counts.updated} already=${counts.already_set} not_found=${counts.not_found} errors=${counts.error}`,
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
