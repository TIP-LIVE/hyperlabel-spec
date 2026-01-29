import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isEmailConfigured } from '@/lib/email'
import { isClerkConfigured } from '@/lib/clerk-config'

/**
 * GET /api/health/ready
 * Readiness check - verifies all dependencies are available
 * Use this for Kubernetes readiness probes
 */
export async function GET() {
  const checks: Record<string, boolean> = {}

  // Database
  try {
    await db.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  // Auth service
  checks.auth = isClerkConfigured()

  // Email service
  checks.email = isEmailConfigured()

  // Stripe (check if keys are set)
  checks.payments = Boolean(
    process.env.STRIPE_SECRET_KEY && 
    !process.env.STRIPE_SECRET_KEY.startsWith('sk_test_REPLACE')
  )

  // Required services for production readiness
  const requiredServices = ['database', 'auth']
  const isReady = requiredServices.every((service) => checks[service])

  return NextResponse.json(
    {
      ready: isReady,
      checks,
    },
    { status: isReady ? 200 : 503 }
  )
}
