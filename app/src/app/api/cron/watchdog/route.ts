import { db } from '@/lib/db'
import { isEmailConfigured, sendEmail } from '@/lib/email'
import { withCronLogging } from '@/lib/cron'
import { render } from '@react-email/components'
import { WatchdogReportEmail } from '@/emails/watchdog-report'
import type { Severity, ReportCategory } from '@/emails/watchdog-report'

const EXPECTED_DAILY_CRONS = [
  'check-delivery',
  'check-battery',
  'check-signals',
  'check-stuck',
  'check-reminders',
  'check-unclaimed-labels',
  'backfill-geocode',
]

const WEEKLY_CRONS = ['cleanup-data'] // Sunday only

/**
 * GET /api/cron/watchdog
 * Daily monitoring report — runs at 14:00 UTC after all crons have completed.
 * Queries 7 monitoring categories and sends a color-coded summary email.
 */
export const GET = withCronLogging('watchdog', async () => {
  const categories = await buildReport()
  await sendReport(categories)

  // Return summary metrics for the cron execution log
  const summary: Record<string, unknown> = {}
  for (const cat of categories) {
    summary[cat.name.toLowerCase().replace(/\s+/g, '_')] = cat.severity
  }
  const worstSeverity = categories.reduce<Severity>((worst, cat) => {
    if (cat.severity === 'critical') return 'critical'
    if (cat.severity === 'warning' && worst !== 'critical') return 'warning'
    return worst
  }, 'ok')
  summary.overall = worstSeverity
  summary.categoriesCount = categories.length

  return summary
})

// ============================================
// REPORT BUILDER
// ============================================

async function buildReport(): Promise<ReportCategory[]> {
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Fetch all today's cron runs once
  const todaysRuns = await db.cronExecutionLog.findMany({
    where: { startedAt: { gte: todayStart } },
    orderBy: { startedAt: 'desc' },
  })

  // Group by jobName, take latest run per job
  const latestByJob = new Map<string, (typeof todaysRuns)[0]>()
  for (const run of todaysRuns) {
    if (run.jobName === 'watchdog') continue // Exclude self
    if (!latestByJob.has(run.jobName)) latestByJob.set(run.jobName, run)
  }

  const categories: ReportCategory[] = []

  // ---- Category 1: SCHEDULER HEALTH ----
  categories.push(await buildSchedulerHealth(todaysRuns, latestByJob))

  // ---- Category 2: JOB FAILURES ----
  categories.push(buildJobFailures(todaysRuns))

  // ---- Category 3: EXECUTION METRICS ----
  categories.push(await buildExecutionMetrics(todaysRuns, latestByJob, sevenDaysAgo))

  // ---- Category 4: SYSTEM HEALTH ----
  categories.push(await buildSystemHealth(sevenDaysAgo, oneDayAgo))

  // ---- Category 5: SHIPMENT HEALTH ----
  categories.push(await buildShipmentHealth(fortyEightHoursAgo, sevenDaysAgo))

  // ---- Category 6: NOTIFICATION DELIVERY ----
  categories.push(await buildNotificationDelivery(oneDayAgo, latestByJob))

  // ---- Category 7: DATA QUALITY ----
  categories.push(await buildDataQuality())

  return categories
}

// ============================================
// CATEGORY BUILDERS
// ============================================

async function buildSchedulerHealth(
  todaysRuns: { jobName: string; status: string; startedAt: Date }[],
  latestByJob: Map<string, { jobName: string; status: string; startedAt: Date }>
): Promise<ReportCategory> {
  const isSunday = new Date().getUTCDay() === 0
  const expectedCrons = [...EXPECTED_DAILY_CRONS, ...(isSunday ? WEEKLY_CRONS : [])]
  const missedCrons = expectedCrons.filter((name) => !latestByJob.has(name))

  // Detect orphaned "running" entries (started > 30 min ago, never finished)
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
  const orphanedRuns = todaysRuns.filter(
    (r) => r.jobName !== 'watchdog' && r.status === 'running' && r.startedAt < thirtyMinAgo
  )

  const totalExpected = expectedCrons.length
  const ran = totalExpected - missedCrons.length
  const details: string[] = []

  if (missedCrons.length > 0) {
    details.push(`Missed crons: ${missedCrons.join(', ')}`)
  }
  if (orphanedRuns.length > 0) {
    details.push(
      `Timed out/crashed: ${orphanedRuns.map((r) => r.jobName).join(', ')}`
    )
  }
  if (!isSunday) {
    const weeklyStatus = latestByJob.has('cleanup-data') ? 'ran today' : 'next run: Sunday'
    details.push(`cleanup-data (weekly): ${weeklyStatus}`)
  }

  let severity: Severity = 'ok'
  if (missedCrons.length > 0 || orphanedRuns.length > 0) severity = 'critical'

  return {
    name: 'Scheduler',
    severity,
    headline: `${ran}/${totalExpected} crons ran${orphanedRuns.length > 0 ? `, ${orphanedRuns.length} timed out` : ''}`,
    details,
  }
}

function buildJobFailures(
  todaysRuns: { jobName: string; status: string; error: string | null; durationMs: number | null }[]
): ReportCategory {
  const failedRuns = todaysRuns.filter(
    (r) => r.jobName !== 'watchdog' && r.status === 'error'
  )

  const details = failedRuns.map(
    (r) =>
      `${r.jobName}: ${r.error || 'Unknown error'} (${r.durationMs ? `${r.durationMs}ms` : 'N/A'})`
  )

  return {
    name: 'Failures',
    severity: failedRuns.length > 0 ? 'critical' : 'ok',
    headline: failedRuns.length > 0 ? `${failedRuns.length} job(s) failed` : '0 errors',
    details,
  }
}

async function buildExecutionMetrics(
  todaysRuns: { jobName: string; status: string; durationMs: number | null; metrics: unknown }[],
  latestByJob: Map<string, { jobName: string; durationMs: number | null; metrics: unknown }>,
  sevenDaysAgo: Date
): Promise<ReportCategory> {
  // 7-day average durations
  const avgDurations = await db.cronExecutionLog.groupBy({
    by: ['jobName'],
    where: {
      status: 'success',
      startedAt: { gte: sevenDaysAgo },
      durationMs: { not: null },
    },
    _avg: { durationMs: true },
  })

  const avgMap = new Map(avgDurations.map((a) => [a.jobName, a._avg.durationMs || 0]))
  const details: string[] = []
  let hasAnomaly = false

  for (const [jobName, run] of latestByJob) {
    if (!run.durationMs) continue
    const avg = avgMap.get(jobName)
    if (avg && avg > 0 && run.durationMs > avg * 3) {
      details.push(
        `${jobName}: ${run.durationMs}ms (3x slower than ${Math.round(avg)}ms avg)`
      )
      hasAnomaly = true
    }
  }

  // Zero-result runs
  for (const [jobName, run] of latestByJob) {
    if (run.metrics && typeof run.metrics === 'object') {
      const m = run.metrics as Record<string, unknown>
      const checked = (m.checked ?? m.found) as number | undefined
      if (checked === 0) {
        details.push(`${jobName}: processed 0 items`)
      }
    }
  }

  // Show execution times for all jobs
  for (const [jobName, run] of latestByJob) {
    if (run.durationMs && !details.some((d) => d.startsWith(jobName))) {
      details.push(`${jobName}: ${run.durationMs}ms`)
    }
  }

  return {
    name: 'Performance',
    severity: hasAnomaly ? 'warning' : 'ok',
    headline: hasAnomaly ? 'Duration anomalies detected' : 'All jobs within normal range',
    details,
  }
}

async function buildSystemHealth(
  sevenDaysAgo: Date,
  oneDayAgo: Date
): Promise<ReportCategory> {
  const details: string[] = []
  let severity: Severity = 'ok'

  // DB latency
  const dbStart = Date.now()
  await db.$queryRaw`SELECT 1`
  const dbLatencyMs = Date.now() - dbStart
  details.push(`DB latency: ${dbLatencyMs}ms`)
  if (dbLatencyMs > 5000) severity = 'critical'

  // Stale active labels (ACTIVE but no location in 7+ days)
  const staleActiveLabels = await db.label.count({
    where: {
      status: 'ACTIVE',
      lastSeenAt: { lt: sevenDaysAgo },
    },
  })
  if (staleActiveLabels > 0) {
    details.push(`Stale active labels (7d+ silent): ${staleActiveLabels}`)
    if (severity !== 'critical') severity = 'warning'
  }

  // Failed webhooks in last 24h
  const failedWebhooks = await db.webhookLog.count({
    where: {
      createdAt: { gte: oneDayAgo },
      statusCode: { gte: 400 },
    },
  })
  const totalWebhooks = await db.webhookLog.count({
    where: { createdAt: { gte: oneDayAgo } },
  })
  details.push(`Webhooks (24h): ${totalWebhooks} total, ${failedWebhooks} failed`)
  if (failedWebhooks > 0 && severity !== 'critical') severity = 'warning'

  return {
    name: 'System',
    severity,
    headline:
      severity === 'ok'
        ? 'All systems operational'
        : severity === 'warning'
          ? 'Issues detected'
          : 'Critical issues',
    details,
  }
}

async function buildShipmentHealth(
  fortyEightHoursAgo: Date,
  sevenDaysAgo: Date
): Promise<ReportCategory> {
  const details: string[] = []

  // Total active shipments
  const activeShipments = await db.shipment.count({
    where: { status: 'IN_TRANSIT' },
  })
  details.push(`Active shipments: ${activeShipments}`)

  // No-signal (IN_TRANSIT, no location in 48h)
  const noSignalCount = await db.shipment.count({
    where: {
      status: 'IN_TRANSIT',
      labelId: { not: null },
      label: {
        status: 'ACTIVE',
        locations: {
          none: { recordedAt: { gte: fortyEightHoursAgo } },
        },
      },
    },
  })
  if (noSignalCount > 0) details.push(`No signal (48h+): ${noSignalCount}`)

  // Low battery
  const lowBatteryCount = await db.label.count({
    where: {
      status: 'ACTIVE',
      batteryPct: { lte: 20, gt: 0 },
    },
  })
  if (lowBatteryCount > 0) details.push(`Low battery (<=20%): ${lowBatteryCount}`)

  // Pending too long
  const pendingTooLong = await db.shipment.count({
    where: {
      status: 'PENDING',
      createdAt: { lte: sevenDaysAgo },
    },
  })
  if (pendingTooLong > 0) details.push(`Pending >7 days: ${pendingTooLong}`)

  // Total delivered today
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const deliveredToday = await db.shipment.count({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: todayStart },
    },
  })
  details.push(`Delivered today: ${deliveredToday}`)

  let severity: Severity = 'ok'
  if (noSignalCount > 5) severity = 'critical'
  else if (noSignalCount > 0 || lowBatteryCount > 0 || pendingTooLong > 0) severity = 'warning'

  return {
    name: 'Shipments',
    severity,
    headline: `${activeShipments} active${noSignalCount > 0 ? `, ${noSignalCount} no-signal` : ''}${lowBatteryCount > 0 ? `, ${lowBatteryCount} low battery` : ''}`,
    details,
  }
}

async function buildNotificationDelivery(
  oneDayAgo: Date,
  latestByJob: Map<string, { metrics: unknown }>
): Promise<ReportCategory> {
  const details: string[] = []

  // Total notifications in last 24h
  const totalNotifs = await db.notification.count({
    where: { sentAt: { gte: oneDayAgo } },
  })
  details.push(`Notifications sent (24h): ${totalNotifs}`)

  // By type
  const byType = await db.notification.groupBy({
    by: ['type'],
    where: { sentAt: { gte: oneDayAgo } },
    _count: true,
  })

  for (const group of byType) {
    details.push(`  ${group.type}: ${group._count}`)
  }

  // Cross-reference with cron metrics
  const notifJobs = ['check-battery', 'check-signals', 'check-stuck', 'check-reminders']
  let cronNotifsSent = 0
  for (const job of notifJobs) {
    const run = latestByJob.get(job)
    if (run?.metrics && typeof run.metrics === 'object') {
      const m = run.metrics as Record<string, number>
      cronNotifsSent += m.notificationsSent || m.remindersSent || 0
    }
  }
  if (cronNotifsSent > 0) {
    details.push(`Cron-triggered notifications today: ${cronNotifsSent}`)
  }

  return {
    name: 'Notifications',
    severity: 'ok',
    headline: `${totalNotifs} sent in last 24h`,
    details,
  }
}

async function buildDataQuality(): Promise<ReportCategory> {
  const details: string[] = []
  let severity: Severity = 'ok'

  // Failed geocodes
  const failedGeocodes = await db.locationEvent.count({
    where: {
      geocodedCity: null,
      latitude: { not: 0 },
      longitude: { not: 0 },
    },
  })
  details.push(`Missing geocoding: ${failedGeocodes}`)
  if (failedGeocodes > 50) severity = 'warning'

  // Orphaned location events (no shipmentId)
  const orphanedLocations = await db.locationEvent.count({
    where: { shipmentId: null },
  })
  details.push(`Orphaned locations (no shipment): ${orphanedLocations}`)

  // Unclaimed labels (expired claim window)
  const unclaimedLabels = await db.label.count({
    where: {
      claimToken: { not: null },
      claimExpiresAt: { lt: new Date() },
    },
  })
  if (unclaimedLabels > 0) {
    details.push(`Expired unclaimed labels: ${unclaimedLabels}`)
    severity = 'warning'
  }

  return {
    name: 'Data Quality',
    severity,
    headline:
      severity === 'ok'
        ? 'No issues'
        : `${failedGeocodes > 50 ? `${failedGeocodes} missing geocodes` : ''}${unclaimedLabels > 0 ? `${failedGeocodes > 50 ? ', ' : ''}${unclaimedLabels} unclaimed labels` : ''}`,
    details,
  }
}

// ============================================
// EMAIL SENDING
// ============================================

async function sendReport(categories: ReportCategory[]) {
  if (!isEmailConfigured()) return

  const adminEmail = process.env.WATCHDOG_EMAIL
  if (!adminEmail) {
    console.warn('[watchdog] WATCHDOG_EMAIL not configured, skipping report')
    return
  }

  const worstSeverity = categories.reduce<Severity>((worst, cat) => {
    if (cat.severity === 'critical') return 'critical'
    if (cat.severity === 'warning' && worst !== 'critical') return 'warning'
    return worst
  }, 'ok')

  const subjectMap: Record<Severity, string> = {
    ok: 'Daily Report: All Systems Healthy',
    warning: 'Daily Report: Warnings Detected',
    critical: 'Daily Report: CRITICAL Issues',
  }

  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'

  const html = await render(
    WatchdogReportEmail({ generatedAt, categories })
  )

  await sendEmail({
    to: adminEmail.split(',').map((e) => e.trim()),
    subject: `[TIP] ${subjectMap[worstSeverity]}`,
    html,
  })
}
