/**
 * One-time script to sync all existing device labels to Onomondo.
 *
 * Usage:
 *   npx tsx scripts/sync-onomondo-labels.ts
 *
 * Requires DATABASE_URL and ONOMONDO_API_KEY in .env (or environment).
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const ONOMONDO_API_BASE = 'https://api.onomondo.com'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function syncLabel(
  iccid: string,
  deviceId: string,
  apiKey: string
): Promise<'ok' | 'not_found' | 'error'> {
  const headers = {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  }

  const searchRes = await fetch(
    `${ONOMONDO_API_BASE}/sims/find?search=${encodeURIComponent(iccid)}&limit=1`,
    { headers }
  )

  if (!searchRes.ok) {
    console.error(`  ✗ Search failed for ${iccid}: HTTP ${searchRes.status}`)
    return 'error'
  }

  const sims = await searchRes.json()
  if (!Array.isArray(sims) || sims.length === 0) {
    console.warn(`  ⚠ No SIM found in Onomondo for ICCID ${iccid}`)
    return 'not_found'
  }

  const simId = sims[0].id
  const currentLabel = sims[0].label

  if (currentLabel === deviceId) {
    console.log(`  ✓ ${deviceId} already set on SIM ${simId} — skipping`)
    return 'ok'
  }

  const patchRes = await fetch(`${ONOMONDO_API_BASE}/sims/${simId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ label: deviceId }),
  })

  if (!patchRes.ok) {
    console.error(
      `  ✗ Failed to update SIM ${simId}: HTTP ${patchRes.status}`
    )
    return 'error'
  }

  console.log(
    `  ✓ ${deviceId} → SIM ${simId}${currentLabel ? ` (was "${currentLabel}")` : ''}`
  )
  return 'ok'
}

async function main() {
  const apiKey = process.env.ONOMONDO_API_KEY
  if (!apiKey) {
    console.error('ONOMONDO_API_KEY is not set')
    process.exit(1)
  }

  const labels = await db.label.findMany({
    where: { iccid: { not: null } },
    select: { deviceId: true, iccid: true },
    orderBy: { deviceId: 'asc' },
  })

  console.log(`Found ${labels.length} devices with ICCID to sync\n`)

  let ok = 0
  let notFound = 0
  let errors = 0

  for (const label of labels) {
    const result = await syncLabel(label.iccid!, label.deviceId, apiKey)
    if (result === 'ok') ok++
    else if (result === 'not_found') notFound++
    else errors++

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`\nDone: ${ok} synced, ${notFound} not found, ${errors} errors`)
  await db.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
