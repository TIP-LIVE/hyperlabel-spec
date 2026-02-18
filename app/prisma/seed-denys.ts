// @ts-nocheck
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding test data for denys@tip.live...')
  console.log('')

  // ============================================
  // 1. Find the real user
  // ============================================
  const user = await prisma.user.findUnique({
    where: { email: 'denys@tip.live' },
  })

  if (!user) {
    console.error('❌ User denys@tip.live not found in database.')
    console.error('   Make sure you have signed up at https://tip.live first.')
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`)

  // ============================================
  // 2. Create labels
  // ============================================
  const labelDefs = [
    { deviceId: 'HL-100001', status: 'SOLD' as const, batteryPct: 100, activatedAt: null },
    { deviceId: 'HL-100002', status: 'ACTIVE' as const, batteryPct: 85, activatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
    { deviceId: 'HL-100003', status: 'ACTIVE' as const, batteryPct: 45, activatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
    { deviceId: 'HL-100004', status: 'ACTIVE' as const, batteryPct: 18, activatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) },
    { deviceId: 'HL-100005', status: 'SOLD' as const, batteryPct: 100, activatedAt: null },
    { deviceId: 'HL-100006', status: 'SOLD' as const, batteryPct: 100, activatedAt: null },
  ]

  const labels: Record<string, { id: string }> = {}

  for (const def of labelDefs) {
    const label = await prisma.label.upsert({
      where: { deviceId: def.deviceId },
      update: {
        status: def.status,
        batteryPct: def.batteryPct,
        activatedAt: def.activatedAt,
      },
      create: {
        deviceId: def.deviceId,
        imei: `35${Math.random().toString().slice(2, 15)}`,
        iccid: `8944${Math.random().toString().slice(2, 18)}`,
        status: def.status,
        batteryPct: def.batteryPct,
        activatedAt: def.activatedAt,
      },
    })
    labels[def.deviceId] = label
  }
  console.log(`✅ Created/updated ${labelDefs.length} labels`)

  // ============================================
  // 3. Create orders
  // ============================================

  // Order 1: Single label, fully delivered
  const order1 = await prisma.order.upsert({
    where: { stripePaymentId: 'test_denys_001' },
    update: { status: 'DELIVERED' },
    create: {
      userId: user.id,
      stripePaymentId: 'test_denys_001',
      stripeSessionId: 'test_session_denys_001',
      status: 'DELIVERED',
      totalAmount: 2500, // £25.00
      currency: 'GBP',
      quantity: 1,
      shippingAddress: {
        name: 'Denys Chumak',
        line1: '42 Tech Lane',
        city: 'London',
        state: 'England',
        postalCode: 'EC2A 4BX',
        country: 'GB',
      },
      trackingNumber: '1Z999AA10123456001',
      shippedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
  })

  const label1 = await prisma.label.findUniqueOrThrow({ where: { deviceId: 'HL-100001' } })
  await prisma.orderLabel.upsert({
    where: { orderId_labelId: { orderId: order1.id, labelId: label1.id } },
    update: {},
    create: { orderId: order1.id, labelId: label1.id },
  })

  // Order 2: 3-pack, delivered, labels in use
  const order2 = await prisma.order.upsert({
    where: { stripePaymentId: 'test_denys_002' },
    update: { status: 'DELIVERED' },
    create: {
      userId: user.id,
      stripePaymentId: 'test_denys_002',
      stripeSessionId: 'test_session_denys_002',
      status: 'DELIVERED',
      totalAmount: 11000, // £110.00
      currency: 'GBP',
      quantity: 3,
      shippingAddress: {
        name: 'Denys Chumak',
        line1: '42 Tech Lane',
        city: 'London',
        state: 'England',
        postalCode: 'EC2A 4BX',
        country: 'GB',
      },
      trackingNumber: '1Z999AA10123456002',
      shippedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  })

  for (const deviceId of ['HL-100002', 'HL-100003', 'HL-100004']) {
    const label = await prisma.label.findUniqueOrThrow({ where: { deviceId } })
    await prisma.orderLabel.upsert({
      where: { orderId_labelId: { orderId: order2.id, labelId: label.id } },
      update: {},
      create: { orderId: order2.id, labelId: label.id },
    })
  }

  // Order 3: 2-pack, shipped but not yet delivered to customer
  const order3 = await prisma.order.upsert({
    where: { stripePaymentId: 'test_denys_003' },
    update: { status: 'SHIPPED' },
    create: {
      userId: user.id,
      stripePaymentId: 'test_denys_003',
      stripeSessionId: 'test_session_denys_003',
      status: 'SHIPPED',
      totalAmount: 5000, // £50.00
      currency: 'GBP',
      quantity: 2,
      shippingAddress: {
        name: 'Denys Chumak',
        line1: '42 Tech Lane',
        city: 'London',
        state: 'England',
        postalCode: 'EC2A 4BX',
        country: 'GB',
      },
      trackingNumber: '1Z999AA10123456003',
      shippedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  })

  for (const deviceId of ['HL-100005', 'HL-100006']) {
    const label = await prisma.label.findUniqueOrThrow({ where: { deviceId } })
    await prisma.orderLabel.upsert({
      where: { orderId_labelId: { orderId: order3.id, labelId: label.id } },
      update: {},
      create: { orderId: order3.id, labelId: label.id },
    })
  }

  console.log('✅ Created/updated 3 orders')

  // ============================================
  // 4. Create shipments with location data
  // ============================================

  // --- Shipment 1: In-transit, Shenzhen → London ---
  const shipment1 = await prisma.shipment.upsert({
    where: { shareCode: 'DENYS01' },
    update: {
      status: 'IN_TRANSIT',
      labelId: labels['HL-100002'].id,
      deliveredAt: null,
    },
    create: {
      name: 'Electronics from Shenzhen',
      userId: user.id,
      labelId: labels['HL-100002'].id,
      status: 'IN_TRANSIT',
      shareCode: 'DENYS01',
      shareEnabled: true,
      originAddress: 'Nanshan District, Shenzhen, China',
      originLat: 22.5431,
      originLng: 114.0579,
      destinationAddress: 'Shoreditch, London, UK',
      destinationLat: 51.5231,
      destinationLng: -0.0767,
      consigneeEmail: 'denys@tip.live',
    },
  })

  // Clear and recreate location events for shipment 1
  await prisma.locationEvent.deleteMany({ where: { shipmentId: shipment1.id } })

  const route1 = [
    { lat: 22.5431, lng: 114.0579, hoursAgo: 120, battery: 98 },  // Shenzhen — origin
    { lat: 22.3193, lng: 114.1694, hoursAgo: 108, battery: 96 },  // Hong Kong — port
    { lat: 1.3521, lng: 103.8198, hoursAgo: 84, battery: 92 },   // Singapore — transit hub
    { lat: 25.2048, lng: 55.2708, hoursAgo: 60, battery: 88 },   // Dubai — transit
    { lat: 41.0082, lng: 28.9784, hoursAgo: 36, battery: 86 },   // Istanbul — overland
    { lat: 48.8566, lng: 2.3522, hoursAgo: 12, battery: 85 },    // Paris — almost there
  ]

  for (const pt of route1) {
    await prisma.locationEvent.create({
      data: {
        labelId: labels['HL-100002'].id,
        shipmentId: shipment1.id,
        latitude: pt.lat,
        longitude: pt.lng,
        batteryPct: pt.battery,
        accuracyM: Math.floor(Math.random() * 10) + 8,
        recordedAt: new Date(Date.now() - pt.hoursAgo * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✅ Shipment 1: "Electronics from Shenzhen" (IN_TRANSIT) — ${route1.length} location points`)

  // --- Shipment 2: Delivered, Shanghai → Manchester ---
  const shipment2 = await prisma.shipment.upsert({
    where: { shareCode: 'DENYS02' },
    update: {
      status: 'DELIVERED',
      labelId: labels['HL-100003'].id,
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: 'Auto Parts from Shanghai',
      userId: user.id,
      labelId: labels['HL-100003'].id,
      status: 'DELIVERED',
      shareCode: 'DENYS02',
      shareEnabled: true,
      originAddress: 'Pudong, Shanghai, China',
      originLat: 31.2304,
      originLng: 121.4737,
      destinationAddress: 'Trafford Park, Manchester, UK',
      destinationLat: 53.4631,
      destinationLng: -2.3106,
      consigneeEmail: 'warehouse@example.com',
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.locationEvent.deleteMany({ where: { shipmentId: shipment2.id } })

  const route2 = [
    { lat: 31.2304, lng: 121.4737, hoursAgo: 288, battery: 95 },  // Shanghai
    { lat: 12.9716, lng: 77.5946, hoursAgo: 240, battery: 82 },   // Bangalore (air hub)
    { lat: 25.2854, lng: 51.5310, hoursAgo: 192, battery: 72 },   // Doha
    { lat: 50.1109, lng: 8.6821, hoursAgo: 120, battery: 58 },    // Frankfurt
    { lat: 53.4631, lng: -2.3106, hoursAgo: 72, battery: 45 },    // Manchester — delivered
  ]

  for (const pt of route2) {
    await prisma.locationEvent.create({
      data: {
        labelId: labels['HL-100003'].id,
        shipmentId: shipment2.id,
        latitude: pt.lat,
        longitude: pt.lng,
        batteryPct: pt.battery,
        accuracyM: Math.floor(Math.random() * 10) + 8,
        recordedAt: new Date(Date.now() - pt.hoursAgo * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✅ Shipment 2: "Auto Parts from Shanghai" (DELIVERED) — ${route2.length} location points`)

  // --- Shipment 3: In-transit, low battery, Istanbul → Berlin ---
  const shipment3 = await prisma.shipment.upsert({
    where: { shareCode: 'DENYS03' },
    update: {
      status: 'IN_TRANSIT',
      labelId: labels['HL-100004'].id,
      deliveredAt: null,
    },
    create: {
      name: 'Textile Samples',
      userId: user.id,
      labelId: labels['HL-100004'].id,
      status: 'IN_TRANSIT',
      shareCode: 'DENYS03',
      shareEnabled: true,
      originAddress: 'Eminönü, Istanbul, Turkey',
      originLat: 41.0082,
      originLng: 28.9784,
      destinationAddress: 'Kreuzberg, Berlin, Germany',
      destinationLat: 52.4934,
      destinationLng: 13.3918,
    },
  })

  await prisma.locationEvent.deleteMany({ where: { shipmentId: shipment3.id } })

  const route3 = [
    { lat: 41.0082, lng: 28.9784, hoursAgo: 72, battery: 28 },   // Istanbul
    { lat: 44.7866, lng: 20.4489, hoursAgo: 36, battery: 22 },   // Belgrade
    { lat: 48.2082, lng: 16.3738, hoursAgo: 8, battery: 18 },    // Vienna — current position
  ]

  for (const pt of route3) {
    await prisma.locationEvent.create({
      data: {
        labelId: labels['HL-100004'].id,
        shipmentId: shipment3.id,
        latitude: pt.lat,
        longitude: pt.lng,
        batteryPct: pt.battery,
        accuracyM: Math.floor(Math.random() * 15) + 10,
        recordedAt: new Date(Date.now() - pt.hoursAgo * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✅ Shipment 3: "Textile Samples" (IN_TRANSIT, low battery) — ${route3.length} location points`)

  // ============================================
  // Summary
  // ============================================
  console.log('')
  console.log('🎉 Seed completed for denys@tip.live!')
  console.log('')
  console.log('📦 Orders:')
  console.log('   1. 1 Label  — £25  — DELIVERED (14 days ago)')
  console.log('   2. 3 Labels — £110 — DELIVERED (10 days ago)')
  console.log('   3. 2 Labels — £50  — SHIPPED (in transit to you)')
  console.log('')
  console.log('🚛 Shipments:')
  console.log('   1. Electronics from Shenzhen → London     [IN_TRANSIT]  /track/DENYS01')
  console.log('   2. Auto Parts Shanghai → Manchester       [DELIVERED]   /track/DENYS02')
  console.log('   3. Textile Samples Istanbul → Berlin       [IN_TRANSIT]  /track/DENYS03')
  console.log('')
  console.log('🏷️  Labels: HL-100001 through HL-100006')
  console.log('')
  console.log('Test URLs:')
  console.log('   https://tip.live/orders')
  console.log('   https://tip.live/shipments')
  console.log('   https://tip.live/track/DENYS01')
  console.log('   https://tip.live/track/DENYS02')
  console.log('   https://tip.live/track/DENYS03')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
