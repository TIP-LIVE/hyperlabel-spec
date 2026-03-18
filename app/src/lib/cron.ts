import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET

type CronHandler = () => Promise<Record<string, unknown>>

/**
 * Wraps a cron job handler with auth verification, execution logging, and error handling.
 * Creates a CronExecutionLog entry tracking status, duration, and metrics.
 * Orphaned "running" entries (from crashes/timeouts) are detected by the watchdog.
 */
export function withCronLogging(jobName: string, handler: CronHandler) {
  return async function GET(req: NextRequest) {
    // Auth check
    const authHeader = req.headers.get('authorization')
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create log entry with status "running"
    const log = await db.cronExecutionLog.create({
      data: { jobName, status: 'running' },
    })

    const startTime = Date.now()

    try {
      const result = await handler()
      const durationMs = Date.now() - startTime

      await db.cronExecutionLog.update({
        where: { id: log.id },
        data: {
          status: 'success',
          durationMs,
          metrics: result as object,
          finishedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, ...result })
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await db.cronExecutionLog
        .update({
          where: { id: log.id },
          data: {
            status: 'error',
            durationMs,
            error: errorMessage,
            finishedAt: new Date(),
          },
        })
        .catch(() => {
          // If DB itself is down, swallow the logging error
        })

      console.error(`[cron/${jobName}] Error:`, error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
