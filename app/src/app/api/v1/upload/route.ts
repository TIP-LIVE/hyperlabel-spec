import { NextRequest, NextResponse } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { requireOrgAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { rateLimit, RATE_LIMIT_UPLOAD, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { nanoid } from 'nanoid'

// Initialize GCS client using Application Default Credentials
// (gcloud auth application-default login for local dev, or service account on GCP)
function getStorage() {
  const credentials = process.env.GCS_SERVICE_ACCOUNT_KEY
  if (credentials) {
    const parsed = JSON.parse(credentials)
    return new Storage({ credentials: parsed, projectId: process.env.GCP_PROJECT_ID })
  }
  // Falls back to Application Default Credentials (gcloud CLI or GCP metadata)
  return new Storage({ projectId: process.env.GCP_PROJECT_ID })
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'tip-cargo-uploads'

/**
 * Ensure the GCS bucket exists, creating it if necessary.
 * Only runs once per cold start.
 */
let bucketVerified = false
async function ensureBucketExists(storage: Storage) {
  if (bucketVerified) return

  const bucket = storage.bucket(BUCKET_NAME)
  const [exists] = await bucket.exists()

  if (!exists) {
    const location = process.env.GCP_LOCATION || 'us-central1'
    console.log(`Creating GCS bucket "${BUCKET_NAME}" in ${location}...`)
    await storage.createBucket(BUCKET_NAME, {
      location,
      storageClass: 'STANDARD',
      uniformBucketLevelAccess: { enabled: true },
    })
    console.log(`Bucket "${BUCKET_NAME}" created.`)
  }

  bucketVerified = true
}

/**
 * Build a GCS URL for the uploaded file.
 * Uses authenticated URL format — images are served through our API proxy
 * or via GCS authenticated access (not public).
 *
 * For the create-shipment form, we store the GCS path (filename)
 * and the form reads it back via the storage client when needed.
 */
function buildGcsUrl(filename: string): string {
  // Store the canonical GCS path - can be resolved via Storage client or API proxy
  return `gs://${BUCKET_NAME}/${filename}`
}

/**
 * POST /api/v1/upload
 *
 * Uploads a file to Google Cloud Storage.
 * Returns the GCS path and a proxied URL for accessing the uploaded file.
 * Auto-creates the bucket if it doesn't exist (using GCP ADC).
 *
 * Accepts multipart form data with a single 'file' field.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit uploads (30 req/min per IP)
    const rl = rateLimit(`upload:${getClientIp(req)}`, RATE_LIMIT_UPLOAD)
    if (!rl.success) return rateLimitResponse(rl)

    const context = await requireOrgAuth()

    // Check if GCP is configured
    if (!process.env.GCP_PROJECT_ID) {
      return NextResponse.json(
        { error: 'File storage not configured. Set GCP_PROJECT_ID.' },
        { status: 503 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Generate a unique filename
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `cargo/${context.orgId}/${nanoid()}.${ext}`

    // Upload to Google Cloud Storage
    const storage = getStorage()

    // Auto-create bucket if needed
    await ensureBucketExists(storage)

    const bucket = storage.bucket(BUCKET_NAME)
    const blob = bucket.file(filename)

    const buffer = Buffer.from(await file.arrayBuffer())

    await blob.save(buffer, {
      contentType: file.type,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    })

    // Return GCS path and a proxy URL for the frontend
    const gcsPath = buildGcsUrl(filename)
    const proxyUrl = `/api/v1/upload/serve?file=${encodeURIComponent(filename)}`

    return NextResponse.json({
      url: proxyUrl,
      gcsPath,
      filename,
      size: file.size,
      contentType: file.type,
    })
  } catch (error) {
    return handleApiError(error, 'uploading file')
  }
}
