import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { scanGrayBuffer, ZBarSymbolType } from '@undecaf/zbar-wasm'
import { requireAuth } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'

// Wasm needs the Node.js runtime — Edge runtime doesn't support sharp.
export const runtime = 'nodejs'
// Multi-strategy decode plus a possible cold start; 30s gives headroom.
export const maxDuration = 30

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB — clients should downscale before posting
const MAX_SIDE = 2000 // server cap, regardless of incoming size

/**
 * POST /api/v1/decode-qr
 *
 * Decode a QR code from a still image using ZBar (the C library used by
 * every Linux distro for 15+ years; significantly more aggressive than
 * BarcodeDetector or zxing-js on marginal prints like our green-on-navy
 * label).
 *
 * Strategy: try the simplest preprocessing first, escalate to more
 * aggressive contrast operations only if the prior attempts return nothing.
 * Returns on the first hit. Most ordinary prints decode on attempt 1.
 *
 * Request: multipart/form-data with `image` field (any sharp-supported format)
 * Response: 200 { text } | 400 invalid input | 404 no QR found | 401 unauthorized
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth()

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
    }

    const image = formData.get('image')
    if (!(image instanceof Blob)) {
      return NextResponse.json({ error: 'Missing "image" field' }, { status: 400 })
    }
    if (image.size === 0) {
      return NextResponse.json({ error: 'Empty image' }, { status: 400 })
    }
    if (image.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Image too large (${image.size} bytes, max ${MAX_BYTES})` },
        { status: 413 }
      )
    }

    const inputBuf = Buffer.from(await image.arrayBuffer())
    const reqStart = Date.now()
    console.info('[decode-qr] start', { bytes: inputBuf.byteLength, type: image.type })

    const tryDecode = async (
      preprocess: (s: sharp.Sharp) => sharp.Sharp
    ): Promise<{ text: string | null; w: number; h: number }> => {
      const pipeline = preprocess(
        sharp(inputBuf)
          .rotate() // honor EXIF orientation
          .grayscale()
          .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      )
      const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
      // Copy into a fresh ArrayBuffer — sharp's Buffer may share its
      // underlying pool, and ZBar's typings reject SharedArrayBuffer.
      const ab = new ArrayBuffer(data.byteLength)
      new Uint8Array(ab).set(data)
      const symbols = await scanGrayBuffer(ab, info.width, info.height)
      const qr = symbols.find((s) => s.type === ZBarSymbolType.ZBAR_QRCODE)
      return { text: qr?.decode('utf-8') || null, w: info.width, h: info.height }
    }

    // Cheap → aggressive. Most prints decode on the first pass.
    const strategies: Array<{ name: string; fn: (s: sharp.Sharp) => sharp.Sharp }> = [
      { name: 'raw', fn: (s) => s },
      { name: 'normalise', fn: (s) => s.normalise() },
      { name: 'normalise+sharpen', fn: (s) => s.normalise().sharpen() },
      { name: 'linear+normalise', fn: (s) => s.linear(1.4, -30).normalise() },
      { name: 'threshold-128', fn: (s) => s.normalise().threshold(128) },
      { name: 'threshold-100', fn: (s) => s.normalise().threshold(100) },
      { name: 'threshold-160', fn: (s) => s.normalise().threshold(160) },
    ]

    const attempts: Array<{ strategy: string; ms: number; ok: boolean; err?: string }> = []
    for (const { name, fn } of strategies) {
      const t0 = Date.now()
      try {
        const { text, w, h } = await tryDecode(fn)
        const ms = Date.now() - t0
        attempts.push({ strategy: name, ms, ok: !!text })
        if (text) {
          console.info('[decode-qr] hit', {
            strategy: name,
            ms,
            totalMs: Date.now() - reqStart,
            wh: `${w}x${h}`,
            len: text.length,
            attempts,
          })
          return NextResponse.json({ text, strategy: name })
        }
      } catch (err) {
        const ms = Date.now() - t0
        const msg = err instanceof Error ? err.message : String(err)
        attempts.push({ strategy: name, ms, ok: false, err: msg })
        console.warn('[decode-qr] strategy threw', { strategy: name, ms, err: msg })
      }
    }

    console.warn('[decode-qr] all strategies failed', {
      totalMs: Date.now() - reqStart,
      attempts,
    })
    return NextResponse.json(
      { error: 'No QR code found after 7 preprocessing strategies', attempts },
      { status: 404 }
    )
  } catch (err) {
    return handleApiError(err, 'POST /api/v1/decode-qr')
  }
}
