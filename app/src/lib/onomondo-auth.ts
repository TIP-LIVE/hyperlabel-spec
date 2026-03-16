import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

function secureCompare(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8')
  const rightBuffer = Buffer.from(right, 'utf8')

  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  return timingSafeEqual(leftBuffer, rightBuffer)
}

function getBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null
  }

  const [scheme, token, ...rest] = authorizationHeader.split(' ')
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    return null
  }

  return token
}

type VerifyOnomondoRequestParams = {
  req: NextRequest
  expectedApiKey?: string | null
  expectedWebhookSecret?: string | null
}

export function verifyOnomondoRequest({
  req,
  expectedApiKey,
  expectedWebhookSecret,
}: VerifyOnomondoRequestParams): boolean {
  const apiKey =
    req.headers.get('x-api-key') || req.nextUrl.searchParams.get('key')

  if (expectedApiKey && apiKey && secureCompare(apiKey, expectedApiKey)) {
    return true
  }

  const secretCandidates = [
    req.headers.get('x-onomondo-webhook-secret'),
    req.headers.get('x-webhook-secret'),
    getBearerToken(req.headers.get('authorization')),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0)

  if (
    expectedWebhookSecret &&
    secretCandidates.some((candidate) => secureCompare(candidate, expectedWebhookSecret))
  ) {
    return true
  }

  return !expectedApiKey && !expectedWebhookSecret
}
