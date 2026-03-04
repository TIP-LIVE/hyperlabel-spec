import { NextRequest } from 'next/server'

/**
 * Create a NextRequest for testing route handlers directly.
 */
export function createTestRequest(
  url: string,
  options?: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  }
): NextRequest {
  const fullUrl = url.startsWith('http')
    ? url
    : `http://localhost:3000${url}`

  const init: RequestInit = {
    method: options?.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  }

  if (options?.body !== undefined) {
    init.body = JSON.stringify(options.body)
  }

  return new NextRequest(fullUrl, init)
}

/**
 * Create a NextRequest with raw text body (for webhook testing).
 */
export function createRawRequest(
  url: string,
  options: {
    method?: string
    body: string
    headers?: Record<string, string>
  }
): NextRequest {
  const fullUrl = url.startsWith('http')
    ? url
    : `http://localhost:3000${url}`

  return new NextRequest(fullUrl, {
    method: options.method ?? 'POST',
    headers: options.headers ?? {},
    body: options.body,
  })
}

/**
 * Parse a NextResponse body.
 */
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; body: T }> {
  const body = await response.json()
  return { status: response.status, body: body as T }
}
