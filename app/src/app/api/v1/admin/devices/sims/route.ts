import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { getOnomonodoSims, getOnomonodoUsage } from '@/lib/onomondo'

export interface SimStatusEntry {
  deviceId: string
  iccid: string | null
  online: boolean | null
  onomondoSimId: string | null
  totalBytes: number
}

/**
 * GET /api/v1/admin/devices/sims
 * Fetches live SIM status from Onomondo API, joined with local label data.
 * Optional query param: ?iccid=xxx to filter to a single SIM.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const filterIccid = searchParams.get('iccid')

    // Get local labels with ICCIDs
    const labels = await db.label.findMany({
      where: {
        status: 'ACTIVE',
        iccid: filterIccid ? filterIccid : { not: null },
      },
      select: { deviceId: true, iccid: true },
    })

    // Fetch SIMs from Onomondo
    let onomondoSims: Awaited<ReturnType<typeof getOnomonodoSims>>
    try {
      onomondoSims = await getOnomonodoSims()
    } catch {
      // Onomondo API unavailable — return labels with null online status
      return NextResponse.json({
        sims: labels.map((l) => ({
          deviceId: l.deviceId,
          iccid: l.iccid,
          online: null,
          onomondoSimId: null,
          totalBytes: 0,
        })),
        onomondoAvailable: false,
      })
    }

    // Build ICCID → Onomondo SIM lookup
    const simByIccid = new Map(
      onomondoSims.map((s) => [s.iccid, s]),
    )

    // Merge local labels with Onomondo data
    const results: SimStatusEntry[] = []
    const usagePromises: Promise<void>[] = []

    for (const label of labels) {
      const sim = label.iccid ? simByIccid.get(label.iccid) : undefined
      const entry: SimStatusEntry = {
        deviceId: label.deviceId,
        iccid: label.iccid,
        online: sim?.online ?? null,
        onomondoSimId: sim?.id ?? null,
        totalBytes: 0,
      }
      results.push(entry)

      // Fetch usage for each SIM (batched)
      if (sim?.id) {
        usagePromises.push(
          getOnomonodoUsage(sim.id).then((usage) => {
            entry.totalBytes = usage.reduce((sum, u) => sum + (u.bytes || 0), 0)
          }),
        )
      }
    }

    await Promise.all(usagePromises)

    const onlineCount = results.filter((r) => r.online === true).length
    const offlineCount = results.filter((r) => r.online === false).length
    const totalBytes = results.reduce((sum, r) => sum + r.totalBytes, 0)

    return NextResponse.json({
      sims: results,
      summary: { onlineCount, offlineCount, totalBytes, total: results.length },
      onomondoAvailable: true,
    })
  } catch (error) {
    return handleApiError(error, 'fetching SIM status')
  }
}
