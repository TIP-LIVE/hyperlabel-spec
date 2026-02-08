import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/user/export
 * GDPR Data Export — returns all user data as JSON or CSV
 *
 * Query params:
 *   format=csv — returns shipments + locations as CSV
 *   format=json (default) — returns full data as JSON
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'

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

    // CSV format — flattened shipments with location events
    if (format === 'csv') {
      const csvLines: string[] = []

      // Shipments CSV
      csvLines.push('--- SHIPMENTS ---')
      csvLines.push(
        'Shipment ID,Name,Status,Device ID,Origin,Destination,Share Code,Created,Delivered'
      )
      for (const s of shipments) {
        csvLines.push(
          [
            s.id,
            escapeCsv(s.name || ''),
            s.status,
            s.label.deviceId,
            escapeCsv(s.originAddress || ''),
            escapeCsv(s.destinationAddress || ''),
            s.shareCode,
            s.createdAt.toISOString(),
            s.deliveredAt?.toISOString() || '',
          ].join(',')
        )
      }

      csvLines.push('')
      csvLines.push('--- LOCATION EVENTS ---')
      csvLines.push(
        'Shipment ID,Shipment Name,Device ID,Latitude,Longitude,Accuracy (m),Battery %,Altitude,Speed,Recorded At,Received At,Offline Sync'
      )
      for (const s of shipments) {
        for (const l of s.locations) {
          csvLines.push(
            [
              s.id,
              escapeCsv(s.name || ''),
              s.label.deviceId,
              l.latitude,
              l.longitude,
              l.accuracyM ?? '',
              l.batteryPct ?? '',
              l.altitude ?? '',
              l.speed ?? '',
              l.recordedAt.toISOString(),
              l.receivedAt.toISOString(),
              l.isOfflineSync,
            ].join(',')
          )
        }
      }

      csvLines.push('')
      csvLines.push('--- ORDERS ---')
      csvLines.push('Order ID,Status,Total (cents),Currency,Quantity,Tracking Number,Created,Shipped')
      for (const o of orders) {
        csvLines.push(
          [
            o.id,
            o.status,
            o.totalAmount,
            o.currency,
            o.quantity,
            o.trackingNumber || '',
            o.createdAt.toISOString(),
            o.shippedAt?.toISOString() || '',
          ].join(',')
        )
      }

      csvLines.push('')
      csvLines.push('--- LABELS ---')
      csvLines.push('Label ID,Device ID,IMEI,ICCID,Status,Battery %,Firmware,Activated,Created')
      for (const l of labels) {
        csvLines.push(
          [
            l.id,
            l.deviceId,
            l.imei || '',
            l.iccid || '',
            l.status,
            l.batteryPct ?? '',
            l.firmwareVersion || '',
            l.activatedAt?.toISOString() || '',
            l.createdAt.toISOString(),
          ].join(',')
        )
      }

      const csvContent = csvLines.join('\n')
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tip-data-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    // JSON format (default)
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

/** Escape a value for CSV — wraps in quotes if it contains comma, quote, or newline */
function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
