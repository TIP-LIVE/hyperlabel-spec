/**
 * One-off script: Register tracking labels to a user's organisation
 * so they appear under "Total Labels" and in the dashboard.
 *
 * Usage (from app/):
 *   USER_EMAIL=denys@tip.live ORG_ID=org_39kuzTcuVMzbtCkVtkznA32ZJTM npx tsx scripts/register-labels-for-user.ts
 *
 * Optional: DEVICE_IDS=TIP-001,TIP-003 (defaults to TIP-001 and TIP-003)
 * Optional: IMEI map via TIP_001_IMEI=868719074243326 TIP_003_IMEI=868719074268588
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const DATABASE_URL = process.env.DATABASE_URL
const USER_EMAIL = process.env.USER_EMAIL ?? 'denys@tip.live'
const ORG_ID = process.env.ORG_ID ?? 'org_39kuzTcuVMzbtCkVtkznA32ZJTM'
const DEVICE_IDS = (process.env.DEVICE_IDS ?? 'TIP-001,TIP-003')
  .split(',')
  .map((s) => s.trim().toUpperCase())
  .filter(Boolean)
/** When set, only create an order for the org (no labels). Use so the org is "findable" and Assign UI works. */
const BOOTSTRAP_ORG_ONLY = process.env.BOOTSTRAP_ORG_ONLY === '1' || process.env.BOOTSTRAP_ORG_ONLY === 'true'

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  console.log('Registering labels for user:', USER_EMAIL)
  console.log('Organisation ID:', ORG_ID)
  console.log('Device IDs:', DEVICE_IDS.join(', '))

  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
  })

  if (!user) {
    console.error('User not found:', USER_EMAIL)
    process.exit(1)
  }

  const labelsToAssign: { id: string; deviceId: string }[] = []

  for (const deviceId of DEVICE_IDS) {
    let label = await prisma.label.findUnique({
      where: { deviceId },
      include: {
        orderLabels: {
          where: { order: { orgId: ORG_ID, status: 'PAID' } },
          take: 1,
        },
      },
    })

    if (!label) {
      const imeiEnv = process.env[`${deviceId.replace(/-/g, '_')}_IMEI`]
      const created = await prisma.label.create({
        data: {
          deviceId,
          status: 'INVENTORY',
          ...(imeiEnv && { imei: imeiEnv }),
        },
      })
      label = { ...created, orderLabels: [] }
      console.log('Created label:', created.deviceId, imeiEnv ? `(IMEI ${imeiEnv})` : '')
    } else if (label.orderLabels.length > 0) {
      console.log('Label already in this org:', label.deviceId)
      continue
    }
    // Allow any status when manually adding to org (e.g. ACTIVE in another org)

    labelsToAssign.push({ id: label.id, deviceId: label.deviceId })
  }

  if (labelsToAssign.length === 0 && !BOOTSTRAP_ORG_ONLY) {
    console.log('No new labels to register.')
    return
  }

  if (BOOTSTRAP_ORG_ONLY) {
    const existing = await prisma.order.findFirst({
      where: { orgId: ORG_ID },
      select: { id: true },
    })
    if (existing) {
      console.log('Org already has an order:', existing.id)
      return
    }
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        orgId: ORG_ID,
        status: 'PAID',
        totalAmount: 0,
        currency: 'GBP',
        quantity: 0,
      },
    })
    console.log('Created bootstrap order', order.id, 'for org. You can now use Assign Labels in the app.')
    return
  }

  const order = await prisma.order.create({
    data: {
      userId: user.id,
      orgId: ORG_ID,
      status: 'PAID',
      totalAmount: 0,
      currency: 'GBP',
      quantity: labelsToAssign.length,
      orderLabels: {
        createMany: {
          data: labelsToAssign.map((l) => ({ labelId: l.id })),
        },
      },
    },
  })

  await prisma.label.updateMany({
    where: { id: { in: labelsToAssign.map((l) => l.id) } },
    data: { status: 'SOLD' },
  })

  console.log('Created order', order.id, 'and assigned', labelsToAssign.length, 'labels:', labelsToAssign.map((l) => l.deviceId).join(', '))
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => pool.end())
