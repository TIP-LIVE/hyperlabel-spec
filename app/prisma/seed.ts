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
  console.log('🌱 Starting seed...')

  // Create demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@tip.live' },
    update: {},
    create: {
      clerkId: 'demo_user_001',
      email: 'demo@tip.live',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
    },
  })
  console.log('✅ Created demo user:', demoUser.email)

  // NOTE: Admin users are auto-assigned via the ADMIN_EMAILS env var.
  // Add your email to ADMIN_EMAILS in .env and sign up via Clerk.
  // The webhook (or getCurrentUser fallback) assigns role: 'admin' automatically.
  // See: src/lib/admin-whitelist.ts

  // Create labels in inventory
  const labelIds = ['HL-001001', 'HL-001002', 'HL-001003', 'HL-001004', 'HL-001005']
  for (const deviceId of labelIds) {
    await prisma.label.upsert({
      where: { deviceId },
      update: {},
      create: {
        deviceId,
        imei: `35${Math.random().toString().slice(2, 15)}`,
        status: 'INVENTORY',
        batteryPct: 100,
      },
    })
  }
  console.log('✅ Created', labelIds.length, 'labels in inventory')

  // Create a demo order with labels assigned
  const soldLabels = ['HL-002001', 'HL-002002', 'HL-002003']

  const order = await prisma.order.upsert({
    where: { stripePaymentId: 'demo_payment_001' },
    update: {
      status: 'DELIVERED',
    },
    create: {
      userId: demoUser.id,
      stripePaymentId: 'demo_payment_001',
      stripeSessionId: 'demo_session_001',
      status: 'DELIVERED',
      totalAmount: 6000, // £60.00
      currency: 'GBP',
      quantity: 3,
      shippingAddress: {
        line1: '123 Demo Street',
        city: 'London',
        country: 'GB',
        postalCode: 'SW1A 1AA',
      },
      trackingNumber: '1Z999AA10123456784',
      shippedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  })

  for (const deviceId of soldLabels) {
    const label = await prisma.label.upsert({
      where: { deviceId },
      update: { status: 'SOLD' },
      create: {
        deviceId,
        imei: `35${Math.random().toString().slice(2, 15)}`,
        status: 'SOLD',
        batteryPct: 100,
      },
    })
    await prisma.orderLabel.upsert({
      where: { orderId_labelId: { orderId: order.id, labelId: label.id } },
      update: {},
      create: { orderId: order.id, labelId: label.id },
    })
  }
  console.log('✅ Created order with', soldLabels.length, 'sold labels')

  // Create active shipments with location data
  const activeLabel = await prisma.label.upsert({
    where: { deviceId: 'HL-003001' },
    update: { status: 'ACTIVE', batteryPct: 72, activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    create: {
      deviceId: 'HL-003001',
      imei: `35${Math.random().toString().slice(2, 15)}`,
      status: 'ACTIVE',
      batteryPct: 72,
      activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  })

  const shipment1 = await prisma.shipment.upsert({
    where: { shareCode: 'DEMO001' },
    update: {
      status: 'IN_TRANSIT',
      deliveredAt: null,
      labelId: activeLabel.id,
    },
    create: {
      name: 'Electronics from Shenzhen',
      userId: demoUser.id,
      labelId: activeLabel.id,
      status: 'IN_TRANSIT',
      shareCode: 'DEMO001',
      shareEnabled: true,
      originAddress: 'Shenzhen, China',
      originLat: 22.5431,
      originLng: 114.0579,
      destinationAddress: 'London, UK',
      destinationLat: 51.5074,
      destinationLng: -0.1278,
    },
  })

  // Clear existing location events for this shipment, then re-create
  await prisma.locationEvent.deleteMany({
    where: { shipmentId: shipment1.id },
  })

  // Add location events for the shipment
  const locations = [
    { lat: 22.5431, lng: 114.0579, hours: 72 }, // Shenzhen
    { lat: 22.3193, lng: 114.1694, hours: 68 }, // Hong Kong
    { lat: 25.2048, lng: 55.2708, hours: 48 },  // Dubai
    { lat: 41.0082, lng: 28.9784, hours: 24 },  // Istanbul
    { lat: 48.8566, lng: 2.3522, hours: 6 },    // Paris
  ]

  for (const loc of locations) {
    await prisma.locationEvent.create({
      data: {
        labelId: activeLabel.id,
        shipmentId: shipment1.id,
        latitude: loc.lat,
        longitude: loc.lng,
        batteryPct: 100 - Math.floor(loc.hours / 3),
        recordedAt: new Date(Date.now() - loc.hours * 60 * 60 * 1000),
      },
    })
  }
  console.log('✅ Created shipment "Electronics from Shenzhen" with', locations.length, 'location events')

  // Create a delivered shipment
  const deliveredLabel = await prisma.label.upsert({
    where: { deviceId: 'HL-003002' },
    update: { status: 'ACTIVE', batteryPct: 45 },
    create: {
      deviceId: 'HL-003002',
      imei: `35${Math.random().toString().slice(2, 15)}`,
      status: 'ACTIVE',
      batteryPct: 45,
      activatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.shipment.upsert({
    where: { shareCode: 'DEMO002' },
    update: {
      status: 'DELIVERED',
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
    create: {
      name: 'Manufacturing Parts',
      userId: demoUser.id,
      labelId: deliveredLabel.id,
      status: 'DELIVERED',
      shareCode: 'DEMO002',
      shareEnabled: true,
      originAddress: 'Shanghai, China',
      originLat: 31.2304,
      originLng: 121.4737,
      destinationAddress: 'Manchester, UK',
      destinationLat: 53.4808,
      destinationLng: -2.2426,
      deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Created delivered shipment "Manufacturing Parts"')

  // Create a low battery label
  await prisma.label.upsert({
    where: { deviceId: 'HL-003003' },
    update: { status: 'ACTIVE', batteryPct: 15 },
    create: {
      deviceId: 'HL-003003',
      imei: `35${Math.random().toString().slice(2, 15)}`,
      status: 'ACTIVE',
      batteryPct: 15,
      activatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
  })
  console.log('✅ Created low battery label HL-003003')

  console.log('')
  console.log('🎉 Seed completed!')
  console.log('')
  console.log('Demo account: demo@tip.live (for data seeding only)')
  console.log('Admin access: add your email to ADMIN_EMAILS in .env, then sign up via Clerk')
  console.log('')
  console.log('Public tracking URLs:')
  console.log('  - /track/DEMO001 (in transit)')
  console.log('  - /track/DEMO002 (delivered)')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
