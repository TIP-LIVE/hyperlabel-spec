import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'

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
 * This avoids needing public bucket access or signed URLs.
 * No auth required — the file path includes the org ID for scoping,
 * and this is only for cargo photos that may appear on public tracking pages.
 */
export async function GET(req: NextRequest) {
  try {
    const filename = req.nextUrl.searchParams.get('file')

    if (!filename) {
      return NextResponse.json({ error: 'Missing file parameter' }, { status: 400 })
    }

    // Validate filename format (prevent path traversal)
    if (filename.includes('..') || !filename.startsWith('cargo/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
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
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
