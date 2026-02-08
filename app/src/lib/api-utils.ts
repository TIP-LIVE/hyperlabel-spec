import { NextResponse } from 'next/server'

/**
 * Standard error handler for API routes that use requireAuth / requireOrgAuth.
 * Catches common auth errors and returns proper JSON responses.
 *
 * Usage:
 *   export async function GET() {
 *     try {
 *       const ctx = await requireOrgAuth()
 *       // ...
 *     } catch (error) {
 *       return handleApiError(error, 'fetching shipments')
 *     }
 *   }
 */
export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof Error) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (error.message === 'Organization required') {
      return NextResponse.json({ error: 'Organization required' }, { status: 403 })
    }
    if (error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  console.error(`Error ${context}:`, error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
