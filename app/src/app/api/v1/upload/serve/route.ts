import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { requireOrgAuth } from '@/lib/auth'

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'tip-cargo-uploads'

function getStorage() {
  const credentials = process.env.GCS_SERVICE_ACCOUNT_KEY
  if (credentials) {
    const parsed = JSON.parse(credentials)
    return new Storage({ credentials: parsed, projectId: process.env.GCP_PROJECT_ID })
  }
  return new Storage({ projectId: process.env.GCP_PROJECT_ID })
}

/**
 * GET /api/v1/upload/serve?file=cargo/orgId/filename.jpg
 *
 * Serves an uploaded file from GCS via server-side proxy.
 * Requires authentication — only org members (or admins) can access
 * files scoped to their org. The orgId is extracted from the file path
 * and compared against the requester's org.
 */
export async function GET(req: NextRequest) {
  try {
    // Auth: require logged-in user with org membership
    let context: Awaited<ReturnType<typeof requireOrgAuth>>
    try {
      context = await requireOrgAuth()
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const filename = req.nextUrl.searchParams.get('file')

    if (!filename) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 })
    }

    // Validate filename format (prevent path traversal)
    if (filename.includes('..') || !filename.startsWith('cargo/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Extract orgId from path: cargo/{orgId}/{filename}
    const parts = filename.split('/')
    const fileOrgId = parts[1]
    if (context.user.role !== 'admin' && fileOrgId !== context.orgId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const storage = getStorage()
    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(filename)

    const [exists] = await blob.exists()
    if (!exists) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Get file metadata for content type
    const [metadata] = await blob.getMetadata()
    const contentType = metadata.contentType || 'application/octet-stream'

    // Download the file from GCS
    const [buffer] = await blob.download()

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const bytes = new Uint8Array(buffer)

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
