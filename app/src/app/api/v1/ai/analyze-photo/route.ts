import { NextRequest, NextResponse } from 'next/server'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { analyzeCargoPhoto, isAIConfigured } from '@/lib/ai'
import { rateLimit, RATE_LIMIT_AI, getClientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/v1/ai/analyze-photo
 *
 * Analyzes a cargo photo using Gemini Vision.
 * Accepts a base64-encoded image in the request body.
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
    const { image, mimeType } = body as { image?: string; mimeType?: string }

    if (!image || !mimeType) {
      return NextResponse.json(
        { error: 'Missing image or mimeType in request body' },
        { status: 400 }
      )
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported image type: ${mimeType}. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Strip data URL prefix if present
    const base64Data = image.includes(',') ? image.split(',')[1] : image

    // Size check (~10MB base64 limit)
    if (base64Data.length > 13_400_000) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const analysis = await analyzeCargoPhoto(base64Data, mimeType)

    return NextResponse.json({ analysis })
  } catch (error) {
    return handleApiError(error, 'analyzing photo')
  }
}
