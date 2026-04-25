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

    // Decode raw RGB once, share across all channel-extraction strategies.
    // Skipping sharp's grayscale conversion deliberately — RGB→grayscale
    // collapses bright green and dark navy into similar luminance values,
    // which is exactly why ZBar couldn't find the QR on our printed labels.
    // Channel extraction (G alone, or G−B) is the right preprocessing for
    // this kind of two-color print and the first thing we should have tried.
    const { data: rgb, info } = await sharp(inputBuf)
      .rotate() // honor EXIF orientation
      .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const pixelCount = info.width * info.height

    const attempts: Array<{ strategy: string; ms: number; ok: boolean; err?: string }> = []

    // ---- Path A: channel-based strategies (color-aware, RGB-direct) ----
    //
    // Each transform takes (R, G, B) and returns a single luminance-like
    // value where bright green becomes light and navy becomes dark. We
    // also stretch the result to fill 0–255 because ZBar's binarizer
    // works best with maximum dynamic range.
    type ChannelTx = (r: number, g: number, b: number) => number
    const channelStrategies: Array<{ name: string; tx: ChannelTx }> = [
      // Raw green channel — green pixels are bright, navy/black are dark.
      // Simplest possible thing for green-on-anything-darker.
      { name: 'green-channel', tx: (_r, g) => g },
      // G − B difference: maximizes contrast between green (high G, low B)
      // and navy (low G, mid B). The classic trick for green-on-navy.
      { name: 'g-minus-b', tx: (_r, g, b) => g - b },
      // G − R: helps when the print uses warm-colored ink contamination.
      { name: 'g-minus-r', tx: (r, g) => g - r },
      // ExG (excess green): 2G − R − B. Used in agricultural imaging to
      // segment green vegetation; perfect for our print signature.
      { name: 'exg', tx: (r, g, b) => 2 * g - r - b },
    ]

    const tryChannelStrategy = async (
      name: string,
      tx: ChannelTx
    ): Promise<string | null> => {
      // First pass: build single-channel buffer, track min/max for stretch.
      const gray = new Uint8Array(pixelCount)
      let min = 255
      let max = 0
      for (let i = 0, j = 0; i < rgb.length; i += 3, j++) {
        let v = tx(rgb[i], rgb[i + 1], rgb[i + 2]) | 0
        if (v < 0) v = 0
        else if (v > 255) v = 255
        gray[j] = v
        if (v < min) min = v
        if (v > max) max = v
      }
      // Second pass: stretch to fill 0–255 (skip if image is near-uniform).
      const range = max - min
      if (range > 8) {
        const scale = 255 / range
        for (let j = 0; j < gray.length; j++) {
          gray[j] = ((gray[j] - min) * scale) | 0
        }
      }
      // Hand to ZBar. Need a fresh ArrayBuffer for the typings.
      const ab = new ArrayBuffer(gray.byteLength)
      new Uint8Array(ab).set(gray)
      const symbols = await scanGrayBuffer(ab, info.width, info.height)
      const qr = symbols.find((s) => s.type === ZBarSymbolType.ZBAR_QRCODE)
      return qr?.decode('utf-8') || null
    }

    for (const { name, tx } of channelStrategies) {
      const t0 = Date.now()
      try {
        const text = await tryChannelStrategy(name, tx)
        const ms = Date.now() - t0
        attempts.push({ strategy: name, ms, ok: !!text })
        if (text) {
          console.info('[decode-qr] hit', {
            strategy: name,
            ms,
            totalMs: Date.now() - reqStart,
            wh: `${info.width}x${info.height}`,
            len: text.length,
            attempts,
          })
          return NextResponse.json({ text, strategy: name })
        }
      } catch (err) {
        const ms = Date.now() - t0
        const msg = err instanceof Error ? err.message : String(err)
        attempts.push({ strategy: name, ms, ok: false, err: msg })
        console.warn('[decode-qr] channel strategy threw', { strategy: name, ms, err: msg })
      }
    }

    // ---- Path B: classic grayscale strategies (fallback) ----
    //
    // Kept for prints where channel extraction doesn't help (e.g. white
    // QR on navy, black QR on white) — luminance is fine for those and
    // the existing escalation (normalise → sharpen → threshold) handles
    // marginal contrast.
    const tryGrayStrategy = async (
      preprocess: (s: sharp.Sharp) => sharp.Sharp
    ): Promise<string | null> => {
      const pipeline = preprocess(
        sharp(inputBuf)
          .rotate()
          .grayscale()
          .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
      )
      const { data, info: gInfo } = await pipeline.raw().toBuffer({ resolveWithObject: true })
      const ab = new ArrayBuffer(data.byteLength)
      new Uint8Array(ab).set(data)
      const symbols = await scanGrayBuffer(ab, gInfo.width, gInfo.height)
      const qr = symbols.find((s) => s.type === ZBarSymbolType.ZBAR_QRCODE)
      return qr?.decode('utf-8') || null
    }

    const grayStrategies: Array<{ name: string; fn: (s: sharp.Sharp) => sharp.Sharp }> = [
      { name: 'raw', fn: (s) => s },
      { name: 'normalise', fn: (s) => s.normalise() },
      { name: 'normalise+sharpen', fn: (s) => s.normalise().sharpen() },
      { name: 'linear+normalise', fn: (s) => s.linear(1.4, -30).normalise() },
      { name: 'threshold-128', fn: (s) => s.normalise().threshold(128) },
      { name: 'threshold-100', fn: (s) => s.normalise().threshold(100) },
      { name: 'threshold-160', fn: (s) => s.normalise().threshold(160) },
    ]

    for (const { name, fn } of grayStrategies) {
      const t0 = Date.now()
      try {
        const text = await tryGrayStrategy(fn)
        const ms = Date.now() - t0
        attempts.push({ strategy: name, ms, ok: !!text })
        if (text) {
          console.info('[decode-qr] hit', {
            strategy: name,
            ms,
            totalMs: Date.now() - reqStart,
            len: text.length,
            attempts,
          })
          return NextResponse.json({ text, strategy: name })
        }
      } catch (err) {
        const ms = Date.now() - t0
        const msg = err instanceof Error ? err.message : String(err)
        attempts.push({ strategy: name, ms, ok: false, err: msg })
        console.warn('[decode-qr] gray strategy threw', { strategy: name, ms, err: msg })
      }
    }

    console.warn('[decode-qr] all strategies failed', {
      totalMs: Date.now() - reqStart,
      attempts,
    })
    return NextResponse.json(
      { error: 'No QR code found after channel + grayscale strategies', attempts },
      { status: 404 }
    )
  } catch (err) {
    return handleApiError(err, 'POST /api/v1/decode-qr')
  }
}
