import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { getOnomonodoSimByIccid, getSimLocation } from '@/lib/onomondo'

// Diagnostic endpoint v2 — with ONOMONDO_API_KEY support

/**
 * GET /api/v1/admin/diagnostics/onomondo
 *
 * Diagnostic endpoint to debug location update issues.
 * Tests the full Onomondo → LocationEvent pipeline for each active label.
 */
export async function GET() {
  try {
    await requireAdmin()

    const envCheck = {
      ONOMONDO_API_KEY: !!process.env.ONOMONDO_API_KEY,
      ONOMONDO_CONNECTOR_API_KEY: !!process.env.ONOMONDO_CONNECTOR_API_KEY,
      ONOMONDO_WEBHOOK_API_KEY: !!process.env.ONOMONDO_WEBHOOK_API_KEY,
      DEVICE_API_KEY: !!process.env.DEVICE_API_KEY,
      CRON_SECRET: !!process.env.CRON_SECRET,
    }

    // Find all labels with ICCID that have active shipments
    const activeLabels = await db.label.findMany({
      where: {
        iccid: { not: null },
        status: 'ACTIVE',
        OR: [
          { shipments: { some: { status: { in: ['PENDING', 'IN_TRANSIT'] } } } },
          { shipmentLabels: { some: { shipment: { status: { in: ['PENDING', 'IN_TRANSIT'] } } } } },
        ],
      },
      select: {
        id: true,
        deviceId: true,
        iccid: true,
        locations: {
          orderBy: { recordedAt: 'desc' },
          take: 1,
          select: { recordedAt: true, source: true },
        },
      },
    })

    const labelDiagnostics = []

    for (const label of activeLabels) {
      const diag: Record<string, unknown> = {
        deviceId: label.deviceId,
        iccid: label.iccid,
        latestLocationAt: label.locations[0]?.recordedAt ?? null,
        latestSource: label.locations[0]?.source ?? null,
      }

      if (!label.iccid) {
        diag.error = 'No ICCID'
        labelDiagnostics.push(diag)
        continue
      }

      // Test SIM lookup
      try {
        const sim = await getOnomonodoSimByIccid(label.iccid)
        if (!sim) {
          diag.simFound = false
          diag.error = 'SIM not found in Onomondo'
          labelDiagnostics.push(diag)
          continue
        }
        diag.simFound = true
        diag.onomondoSimId = sim.id
        diag.simOnline = sim.online

        // Test location fetch
        const loc = await getSimLocation(sim.id)
        if (!loc) {
          diag.onomondoLocation = null
          diag.error = 'Onomondo returned no location data'
        } else {
          diag.onomondoLocation = {
            lat: loc.lat,
            lng: loc.lng,
            accuracy: loc.accuracy,
            time: loc.time,
          }

          // Compare timestamps
          const onomondoTime = new Date(loc.time)
          const latestRecordedAt = label.locations[0]?.recordedAt
          if (latestRecordedAt) {
            const diffMs = onomondoTime.getTime() - latestRecordedAt.getTime()
            diag.timeDiffMs = diffMs
            diag.wouldSync = diffMs >= 5 * 60 * 1000
          } else {
            diag.wouldSync = true
          }
        }
      } catch (err) {
        diag.error = err instanceof Error ? err.message : String(err)
      }

      labelDiagnostics.push(diag)
    }

    // Latest 10 location events across ALL labels (reveals if data IS arriving)
    const recentEvents = await db.locationEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        labelId: true,
        shipmentId: true,
        source: true,
        recordedAt: true,
        receivedAt: true,
        geocodedCity: true,
        geocodedCountry: true,
        label: { select: { deviceId: true } },
      },
    })

    return NextResponse.json({
      envVarsSet: envCheck,
      activeLabelsCount: activeLabels.length,
      labels: labelDiagnostics,
      recentLocationEvents: recentEvents.map((e) => ({
        id: e.id,
        deviceId: e.label.deviceId,
        shipmentId: e.shipmentId,
        orphaned: e.shipmentId === null,
        source: e.source,
        recordedAt: e.recordedAt,
        receivedAt: e.receivedAt,
        location: e.geocodedCity
          ? `${e.geocodedCity}, ${e.geocodedCountry}`
          : null,
      })),
    })
  } catch (error) {
    return handleApiError(error, 'running onomondo diagnostics')
  }
}
