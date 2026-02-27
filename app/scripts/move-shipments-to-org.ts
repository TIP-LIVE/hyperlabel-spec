/**
 * One-off script: Move shipments to a target organisation.
 *
 * Usage (from app/):
 *   TARGET_ORG_ID=org_39nUbqF2bR1sFlQv3dSEIJHHwsD npx tsx scripts/move-shipments-to-org.ts
 *
 * Optional: FROM_ORG_ID=org_xxx — only move shipments from this org (default: move all that are not already in TARGET_ORG_ID)
 * Optional: SHIPMENT_IDS=id1,id2 — only move these shipment IDs
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
const TARGET_ORG_ID = process.env.TARGET_ORG_ID
const FROM_ORG_ID = process.env.FROM_ORG_ID
const SHIPMENT_IDS = process.env.SHIPMENT_IDS
  ? process.env.SHIPMENT_IDS.split(',').map((s) => s.trim()).filter(Boolean)
  : null

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

if (!TARGET_ORG_ID) {
  console.error('TARGET_ORG_ID is required (e.g. org_39nUbqF2bR1sFlQv3dSEIJHHwsD)')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  type Where = { id?: { in: string[] }; orgId?: string | null | { not: string }; OR?: Array<{ orgId: string | null | { not: string } }> }
  const where: Where = {}
  if (SHIPMENT_IDS?.length) {
    where.id = { in: SHIPMENT_IDS }
  }
  if (FROM_ORG_ID) {
    where.orgId = FROM_ORG_ID
  } else {
    where.OR = [{ orgId: null }, { orgId: { not: TARGET_ORG_ID } }]
  }

  const toMove = await prisma.shipment.findMany({
    where,
    select: { id: true, name: true, shareCode: true, orgId: true, status: true },
  })

  if (toMove.length === 0) {
    console.log('No shipments to move.')
    return
  }

  console.log('Moving', toMove.length, 'shipment(s) to org', TARGET_ORG_ID)
  for (const s of toMove) {
    console.log('  -', s.shareCode, s.name || 'Unnamed', `(from ${s.orgId ?? 'null'})`)
  }

  const result = await prisma.shipment.updateMany({
    where: { id: { in: toMove.map((s) => s.id) } },
    data: { orgId: TARGET_ORG_ID },
  })

  console.log('Updated', result.count, 'shipment(s).')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
