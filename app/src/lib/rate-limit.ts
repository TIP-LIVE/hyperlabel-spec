/**
 * Simple in-memory rate limiter using sliding window counters.
 * Works on Vercel serverless (per-instance), and provides basic DDoS protection.
 *
 * For production at scale, consider upgrading to Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now

  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  resetAt: number
}

/**
 * Check rate limit for a given key (IP, API key, user ID, etc.)
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const entry = store.get(key)

  // No existing entry or window expired → reset
  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    store.set(key, newEntry)
    return {
      success: true,
      limit: config.limit,
      remaining: config.limit - 1,
      resetAt: newEntry.resetAt,
    }
  }

  // Within window
  entry.count++

  if (entry.count > config.limit) {
    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  }
}

// ============================================
// Pre-configured rate limit profiles
// ============================================

/** Device report endpoint: 120 requests/min per API key (2 per second) */
export const RATE_LIMIT_DEVICE = { limit: 120, windowMs: 60_000 }

/** Public tracking API: 60 requests/min per IP */
export const RATE_LIMIT_PUBLIC = { limit: 60, windowMs: 60_000 }

/** Authenticated API: 100 requests/min per user */
export const RATE_LIMIT_API = { limit: 100, windowMs: 60_000 }

/** Checkout / payment: 10 requests/min per user */
export const RATE_LIMIT_CHECKOUT = { limit: 10, windowMs: 60_000 }

/** AI endpoints: 20 requests/min per user */
export const RATE_LIMIT_AI = { limit: 20, windowMs: 60_000 }

/** File upload: 30 requests/min per user */
export const RATE_LIMIT_UPLOAD = { limit: 30, windowMs: 60_000 }

// ============================================
// Helper to get client IP from request
// ============================================

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return '127.0.0.1'
}

// ============================================
// NextResponse helper for rate limit errors
// ============================================

import { NextResponse } from 'next/server'

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many requests',
      retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
    },
    {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
      },
    }
  )
}
