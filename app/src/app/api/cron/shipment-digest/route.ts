import { db, VALID_LOCATION } from '@/lib/db'
import { sendShipmentStatusDigest } from '@/lib/notifications'
import { withCronLogging } from '@/lib/cron'
import { haversineDistanceM } from '@/lib/utils/geo'

/**
 * GET /api/cron/shipment-digest
 *
 * Consolidated daily status digest. Replaces the three separate alert crons
 * that used to fire back-to-back (check-signals 8am, check-stuck 9am,
 * check-reminders 10am UTC) — each of which sent its own per-shipment email,
 * so a user with 3 problem shipments could receive 9 emails a day.
 *
 * This cron produces ONE email per user per day, with sections for:
 *   - Awaiting first signal (PENDING cargo > 3 days old, created > 48h ago)
 *   - Silent recently (IN_TRANSIT label not heard from > org threshold)
 *   - Not moving (IN_TRANSIT label with < 500m movement over 48h)
 *   - Unused labels (SOLD for > 7 days, never in a shipment)
 *
 * Backoff per shipment: first digest when condition threshold is met, then
 * subsequent digests at +3d, +7d, +14d intervals, then silent until the issue
 * resolves (PENDING→IN_TRANSIT, signal recovery, auto-delivery in
 * device-report.ts reset the counters).
 *
 * Cadence per user (User.digestCadence):
 *   - OFF: never send
 *   - WEEKLY: only send on Mondays UTC
 *   - DAILY: send every day if there's something to report (default)
 *
 * Staff accounts (email in ADMIN_EMAILS) default to OFF via the Clerk webhook
 * so internal test shipments don't blast inboxes.
 */

const DEFAULT_NO_SIGNAL_HOURS = 48
const STUCK_MOVEMENT_THRESHOLD_M = 500
const STUCK_WINDOW_HOURS = 48
const PENDING_THRESHOLD_DAYS = 3
const FRESH_SHIPMENT_GRACE_HOURS = 48
const UNUSED_LABEL_DAYS = 7

// After the first digest, wait these many days before the next one.
// digestCount=1 → wait BACKOFF_DAYS[0] days, digestCount=2 → [1], etc.
// After digestCount exceeds BACKOFF_DAYS.length (= 3) we stay silent until
// counters reset (total 4 digests per problem period).
const BACKOFF_DAYS = [3, 7, 14]

/**
 * Apply backoff: should this shipment be included in today's digest?
 */
function shouldIncludeInDigest(
  shipment: { digestCount: number; lastDigestAt: Date | null },
  now: Date
): boolean {
  // First digest for this problem period — include.
  if (!shipment.lastDigestAt || shipment.digestCount === 0) return true
  // Map digestCount (1..N) to the gap index (0..N-1). Anything past the
  // configured schedule stays silent until counters reset in device-report.ts
  // (PENDING→IN_TRANSIT, auto-delivery, or fresh LocationEvent on IN_TRANSIT).
  const gapIndex = shipment.digestCount - 1
  if (gapIndex >= BACKOFF_DAYS.length) return false
  const gapMs = BACKOFF_DAYS[gapIndex] * 24 * 60 * 60 * 1000
  return now.getTime() - shipment.lastDigestAt.getTime() >= gapMs
}

type Classification = 'pending' | 'silent' | 'stuck'

interface ClassifiedShipment {
  kind: Classification
  shipmentId: string
  userId: string
  orgId: string | null
  name: string
  shareCode: string
  createdAt: Date
  labelDeviceId?: string
  lastSeenAt?: Date
  stuckSinceHours?: number
  lastLocation?: {
    city: string | null
    area: string | null
    country: string | null
  }
}

export const GET = withCronLogging('shipment-digest', async () => {
  const now = new Date()
  const isMondayUTC = now.getUTCDay() === 1

  const pendingThresholdDate = new Date(
    now.getTime() - PENDING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
  )
  const freshnessGraceDate = new Date(
    now.getTime() - FRESH_SHIPMENT_GRACE_HOURS * 60 * 60 * 1000
  )
  const stuckWindowStart = new Date(
    now.getTime() - STUCK_WINDOW_HOURS * 60 * 60 * 1000
  )
  const unusedLabelDate = new Date(
    now.getTime() - UNUSED_LABEL_DAYS * 24 * 60 * 60 * 1000
  )
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // 1) Candidate shipments: PENDING > 3d, or IN_TRANSIT with active label.
  const candidates = await db.shipment.findMany({
    where: {
      type: 'CARGO_TRACKING',
      OR: [
        {
          status: 'PENDING',
          createdAt: { lte: pendingThresholdDate },
        },
        {
          status: 'IN_TRANSIT',
          labelId: { not: null },
          label: { status: 'ACTIVE' },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      orgId: true,
      name: true,
      shareCode: true,
      createdAt: true,
      status: true,
      digestCount: true,
      lastDigestAt: true,
      label: {
        select: {
          id: true,
          deviceId: true,
          lastSeenAt: true,
          activatedAt: true,
        },
      },
    },
  })

  // Org thresholds (noSignalHours) — bulk load.
  const orgIds = [
    ...new Set(
      candidates.map((s) => s.orgId).filter((id): id is string => !!id)
    ),
  ]
  const orgSettings = orgIds.length
    ? await db.orgSettings.findMany({
        where: { orgId: { in: orgIds } },
        select: { orgId: true, noSignalHours: true },
      })
    : []
  const thresholdByOrg = new Map(
    orgSettings.map((s) => [s.orgId, s.noSignalHours])
  )

  const classified: ClassifiedShipment[] = []
  let skippedGrace = 0
  let skippedBackoff = 0

  // Split into PENDING (no DB lookup needed) and IN_TRANSIT (needs location
  // data). IN_TRANSIT candidates are bulk-loaded below so we don't fire one
  // query per shipment inside the classification loop.
  interface InTransitWork {
    shipment: (typeof candidates)[number]
    labelId: string
    lastSeen: Date
    thresholdMs: number
  }
  const inTransitWork: InTransitWork[] = []

  for (const s of candidates) {
    // 48h fresh-shipment grace — never nag a just-created shipment.
    if (s.createdAt > freshnessGraceDate) {
      skippedGrace++
      continue
    }

    if (
      !shouldIncludeInDigest(
        { digestCount: s.digestCount, lastDigestAt: s.lastDigestAt },
        now
      )
    ) {
      skippedBackoff++
      continue
    }

    if (s.status === 'PENDING') {
      classified.push({
        kind: 'pending',
        shipmentId: s.id,
        userId: s.userId,
        orgId: s.orgId,
        name: s.name ?? 'Unnamed shipment',
        shareCode: s.shareCode,
        createdAt: s.createdAt,
      })
      continue
    }

    // IN_TRANSIT branch
    if (!s.label) continue

    const thresholdHours =
      (s.orgId ? thresholdByOrg.get(s.orgId) : undefined) ??
      DEFAULT_NO_SIGNAL_HOURS
    inTransitWork.push({
      shipment: s,
      labelId: s.label.id,
      lastSeen: s.label.lastSeenAt ?? s.label.activatedAt ?? s.createdAt,
      thresholdMs: thresholdHours * 60 * 60 * 1000,
    })
  }

  // Bulk-load recent events for all IN_TRANSIT candidates in a single query.
  // Covers the stuck-window detection and serves as the latest-location
  // source for silent shipments whose last event falls inside the window.
  const inTransitLabelIds = [
    ...new Set(inTransitWork.map((w) => w.labelId)),
  ]
  const stuckWindowEvents =
    inTransitLabelIds.length === 0
      ? []
      : await db.locationEvent.findMany({
          where: {
            labelId: { in: inTransitLabelIds },
            ...VALID_LOCATION,
            recordedAt: { gte: stuckWindowStart },
          },
          orderBy: [{ labelId: 'asc' }, { recordedAt: 'desc' }],
          select: {
            labelId: true,
            latitude: true,
            longitude: true,
            recordedAt: true,
            geocodedCity: true,
            geocodedArea: true,
            geocodedCountry: true,
          },
        })

  interface WindowEvent {
    latitude: number
    longitude: number
    recordedAt: Date
    geocodedCity: string | null
    geocodedArea: string | null
    geocodedCountry: string | null
  }
  // Preserve the original `take: 20` per-label cap.
  const eventsByLabel = new Map<string, WindowEvent[]>()
  for (const e of stuckWindowEvents) {
    if (!e.labelId) continue
    const bucket = eventsByLabel.get(e.labelId) ?? []
    if (bucket.length < 20) {
      bucket.push({
        latitude: e.latitude,
        longitude: e.longitude,
        recordedAt: e.recordedAt,
        geocodedCity: e.geocodedCity,
        geocodedArea: e.geocodedArea,
        geocodedCountry: e.geocodedCountry,
      })
    }
    eventsByLabel.set(e.labelId, bucket)
  }

  // For silent labels whose last event is OLDER than the stuck window (nothing
  // loaded above), fall back to a parallel latest-event lookup. Kept as a set
  // of parallel findFirsts rather than one raw-SQL DISTINCT ON for simplicity.
  const silentFallbackIds: string[] = []
  for (const w of inTransitWork) {
    const isSilent = now.getTime() - w.lastSeen.getTime() >= w.thresholdMs
    const hasWindowEvents = (eventsByLabel.get(w.labelId)?.length ?? 0) > 0
    if (isSilent && !hasWindowEvents) silentFallbackIds.push(w.labelId)
  }
  const silentFallbackLocs = silentFallbackIds.length === 0
    ? []
    : await Promise.all(
        silentFallbackIds.map((labelId) =>
          db.locationEvent
            .findFirst({
              where: { labelId, ...VALID_LOCATION },
              orderBy: { recordedAt: 'desc' },
              select: {
                geocodedCity: true,
                geocodedArea: true,
                geocodedCountry: true,
              },
            })
            .then((loc) => ({ labelId, loc }))
        )
      )
  const fallbackLocByLabel = new Map(
    silentFallbackLocs.map((r) => [r.labelId, r.loc])
  )

  // Classify in-memory — no more DB calls past this point.
  for (const w of inTransitWork) {
    const { shipment: s, labelId, lastSeen, thresholdMs } = w
    const windowEvents = eventsByLabel.get(labelId) ?? []

    // Silent check.
    if (now.getTime() - lastSeen.getTime() >= thresholdMs) {
      const loc = windowEvents[0] ?? fallbackLocByLabel.get(labelId) ?? null
      classified.push({
        kind: 'silent',
        shipmentId: s.id,
        userId: s.userId,
        orgId: s.orgId,
        name: s.name ?? 'Unnamed shipment',
        shareCode: s.shareCode,
        createdAt: s.createdAt,
        labelDeviceId: s.label!.deviceId,
        lastSeenAt: lastSeen,
        lastLocation: loc
          ? {
              city: loc.geocodedCity,
              area: loc.geocodedArea,
              country: loc.geocodedCountry,
            }
          : undefined,
      })
      continue
    }

    // Stuck check — location reporting but no meaningful movement.
    if (windowEvents.length < 2) continue

    let maxDistance = 0
    for (let i = 0; i < windowEvents.length; i++) {
      for (let j = i + 1; j < windowEvents.length; j++) {
        const d = haversineDistanceM(
          windowEvents[i].latitude,
          windowEvents[i].longitude,
          windowEvents[j].latitude,
          windowEvents[j].longitude
        )
        if (d > maxDistance) maxDistance = d
      }
    }

    if (maxDistance >= STUCK_MOVEMENT_THRESHOLD_M) continue

    const oldestInWindow = windowEvents[windowEvents.length - 1]
    const newestInWindow = windowEvents[0]
    const stuckDurationHours =
      (newestInWindow.recordedAt.getTime() -
        oldestInWindow.recordedAt.getTime()) /
      (60 * 60 * 1000)
    if (stuckDurationHours < STUCK_WINDOW_HOURS) continue

    const stuckSinceHours = Math.round(
      (now.getTime() - oldestInWindow.recordedAt.getTime()) /
        (60 * 60 * 1000)
    )

    classified.push({
      kind: 'stuck',
      shipmentId: s.id,
      userId: s.userId,
      orgId: s.orgId,
      name: s.name ?? 'Unnamed shipment',
      shareCode: s.shareCode,
      createdAt: s.createdAt,
      labelDeviceId: s.label!.deviceId,
      stuckSinceHours,
      lastLocation: {
        city: newestInWindow.geocodedCity,
        area: newestInWindow.geocodedArea,
        country: newestInWindow.geocodedCountry,
      },
    })
  }

  // 2) Unused labels (aggregate per user).
  const unusedLabels = await db.label.findMany({
    where: {
      status: 'SOLD',
      orderLabels: {
        some: {
          order: {
            status: { in: ['SHIPPED', 'DELIVERED'] },
            shippedAt: { lte: unusedLabelDate },
          },
        },
      },
      shipments: { none: {} },
    },
    select: {
      id: true,
      orderLabels: {
        select: { order: { select: { userId: true } } },
        take: 1,
      },
    },
  })

  const unusedByUser = new Map<string, number>()
  for (const l of unusedLabels) {
    const userId = l.orderLabels[0]?.order?.userId
    if (!userId) continue
    unusedByUser.set(userId, (unusedByUser.get(userId) ?? 0) + 1)
  }

  // 3) Group by owner user (org fan-out kept out of this pass; every user who
  //    owns affected shipments gets their own digest).
  interface UserDigest {
    userId: string
    pending: ClassifiedShipment[]
    silent: ClassifiedShipment[]
    stuck: ClassifiedShipment[]
    unusedCount: number
  }
  const byUser = new Map<string, UserDigest>()
  function ensureUser(userId: string): UserDigest {
    let bucket = byUser.get(userId)
    if (!bucket) {
      bucket = {
        userId,
        pending: [],
        silent: [],
        stuck: [],
        unusedCount: 0,
      }
      byUser.set(userId, bucket)
    }
    return bucket
  }

  for (const c of classified) {
    const bucket = ensureUser(c.userId)
    if (c.kind === 'pending') bucket.pending.push(c)
    else if (c.kind === 'silent') bucket.silent.push(c)
    else if (c.kind === 'stuck') bucket.stuck.push(c)
  }
  for (const [userId, count] of unusedByUser) {
    ensureUser(userId).unusedCount = count
  }

  // 4) Apply cadence + 24h throttle, then send.
  let digestsSent = 0
  let skippedCadence = 0
  let skippedThrottle = 0
  let skippedEmpty = 0
  const includedShipmentIds: string[] = []

  for (const [userId, bucket] of byUser) {
    const totalItems =
      bucket.pending.length +
      bucket.silent.length +
      bucket.stuck.length +
      bucket.unusedCount
    if (totalItems === 0) {
      skippedEmpty++
      continue
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        firstName: true,
        notifyReminders: true,
        digestCadence: true,
      },
    })
    if (!user?.email) continue
    if (!user.notifyReminders) {
      skippedCadence++
      continue
    }
    if (user.digestCadence === 'OFF') {
      skippedCadence++
      continue
    }
    if (user.digestCadence === 'WEEKLY' && !isMondayUTC) {
      skippedCadence++
      continue
    }

    // 24h per-user throttle (belt + braces over per-shipment backoff).
    const recent = await db.notification.findFirst({
      where: {
        userId,
        type: 'shipment_status_digest',
        sentAt: { gte: oneDayAgo },
      },
      select: { id: true },
    })
    if (recent) {
      skippedThrottle++
      continue
    }

    try {
      await sendShipmentStatusDigest({
        userId,
        userEmail: user.email,
        userName: user.firstName ?? 'there',
        cadence: user.digestCadence === 'WEEKLY' ? 'WEEKLY' : 'DAILY',
        pending: bucket.pending.map((c) => ({
          shipmentId: c.shipmentId,
          name: c.name,
          shareCode: c.shareCode,
          createdAt: c.createdAt,
        })),
        silent: bucket.silent.map((c) => ({
          shipmentId: c.shipmentId,
          name: c.name,
          shareCode: c.shareCode,
          lastSeenAt: c.lastSeenAt!,
          lastLocation: c.lastLocation,
        })),
        stuck: bucket.stuck.map((c) => ({
          shipmentId: c.shipmentId,
          name: c.name,
          shareCode: c.shareCode,
          stuckSinceHours: c.stuckSinceHours!,
          lastLocation: c.lastLocation,
        })),
        unusedCount: bucket.unusedCount,
      })

      for (const c of bucket.pending) includedShipmentIds.push(c.shipmentId)
      for (const c of bucket.silent) includedShipmentIds.push(c.shipmentId)
      for (const c of bucket.stuck) includedShipmentIds.push(c.shipmentId)
      digestsSent++
    } catch (err) {
      console.error('[shipment-digest] Failed to send digest:', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  // 5) Bump digestCount + lastDigestAt for every shipment actually included.
  if (includedShipmentIds.length > 0) {
    await db.shipment.updateMany({
      where: { id: { in: includedShipmentIds } },
      data: {
        digestCount: { increment: 1 },
        lastDigestAt: now,
      },
    })
  }

  return {
    candidates: candidates.length,
    classified: classified.length,
    pending: classified.filter((c) => c.kind === 'pending').length,
    silent: classified.filter((c) => c.kind === 'silent').length,
    stuck: classified.filter((c) => c.kind === 'stuck').length,
    usersWithItems: byUser.size,
    digestsSent,
    skippedGrace,
    skippedBackoff,
    skippedCadence,
    skippedThrottle,
    skippedEmpty,
    updatedShipments: includedShipmentIds.length,
  }
})
