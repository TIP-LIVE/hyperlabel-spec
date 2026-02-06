import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/user/export
 * GDPR Data Export — returns all user data as JSON
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all user data
    const [userData, shipments, orders, notifications, labels] = await Promise.all([
      db.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          notifyLabelActivated: true,
          notifyLowBattery: true,
          notifyNoSignal: true,
          notifyDelivered: true,
          notifyOrderShipped: true,
        },
      }),
      db.shipment.findMany({
        where: { userId: user.id },
        include: {
          locations: {
            orderBy: { recordedAt: 'asc' },
          },
          label: {
            select: {
              deviceId: true,
              imei: true,
              status: true,
              batteryPct: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.order.findMany({
        where: { userId: user.id },
        include: {
          labels: {
            select: {
              deviceId: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { sentAt: 'desc' },
      }),
      // Labels owned by user (via orders)
      db.label.findMany({
        where: {
          order: { userId: user.id },
        },
        select: {
          id: true,
          deviceId: true,
          imei: true,
          iccid: true,
          status: true,
          batteryPct: true,
          firmwareVersion: true,
          activatedAt: true,
          createdAt: true,
        },
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: userData,
      shipments: shipments.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        originAddress: s.originAddress,
        destinationAddress: s.destinationAddress,
        shareCode: s.shareCode,
        shareEnabled: s.shareEnabled,
        photoUrls: s.photoUrls,
        createdAt: s.createdAt,
        deliveredAt: s.deliveredAt,
        label: s.label,
        locationEvents: s.locations.map((l) => ({
          latitude: l.latitude,
          longitude: l.longitude,
          accuracyM: l.accuracyM,
          batteryPct: l.batteryPct,
          altitude: l.altitude,
          speed: l.speed,
          recordedAt: l.recordedAt,
          receivedAt: l.receivedAt,
          isOfflineSync: l.isOfflineSync,
        })),
      })),
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount,
        currency: o.currency,
        quantity: o.quantity,
        shippingAddress: o.shippingAddress,
        trackingNumber: o.trackingNumber,
        createdAt: o.createdAt,
        shippedAt: o.shippedAt,
        labels: o.labels,
      })),
      labels,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.message,
        read: n.read,
        sentAt: n.sentAt,
      })),
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tip-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exporting user data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
