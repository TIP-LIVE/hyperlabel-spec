import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { normalizeAddress, isAIConfigured } from '@/lib/ai'
import { rateLimit, RATE_LIMIT_AI, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/v1/ai/normalize-address
 *
 * Normalizes a raw address string using Gemini.
 * Fixes typos, abbreviations, missing components.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit AI calls (20 req/min per IP)
    const rl = rateLimit(`ai:${getClientIp(req)}`, RATE_LIMIT_AI)
    if (!rl.success) return rateLimitResponse(rl)

    await requireOrgAuth()

    if (!isAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service not configured' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { address } = body as { address?: string }

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing address in request body' },
        { status: 400 }
      )
    }

    if (address.length > 500) {
      return NextResponse.json(
        { error: 'Address too long. Maximum 500 characters.' },
        { status: 400 }
      )
    }

    const result = await normalizeAddress(address)

    return NextResponse.json({ result })
  } catch (error) {
    return handleApiError(error, 'normalizing address')
  }
}
