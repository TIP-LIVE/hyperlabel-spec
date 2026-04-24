'use client'

// Native BarcodeDetector — iOS Safari 17+ and Chrome. Not in lib.dom yet.
interface BarcodeDetectorResult {
  rawValue: string
  format: string
}
interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement | ImageBitmapSource): Promise<BarcodeDetectorResult[]>
}
interface BarcodeDetectorCtor {
  new (init?: { formats?: string[] }): BarcodeDetectorInstance
  getSupportedFormats?: () => Promise<string[]>
}

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

export interface QrScanController {
  stop: () => void
  torchSupported: boolean
  setTorch: (on: boolean) => Promise<void>
}

/**
 * Source of the <video> element to render the camera into.
 * Accepts either the element directly or a ref-like — the ref form is
 * preferred because callers often invoke `startQrScan` in the same tick
 * as the state change that mounts the <video> (e.g. switching dialog
 * modes). Resolving the ref via polling lets React mount the element
 * before we try to attach the stream.
 */
export type VideoElementSource =
  | HTMLVideoElement
  | { current: HTMLVideoElement | null }
  | (() => HTMLVideoElement | null)

async function resolveVideoElement(
  source: VideoElementSource,
  timeoutMs = 1500
): Promise<HTMLVideoElement> {
  const read = (): HTMLVideoElement | null => {
    if (typeof source === 'function') return source()
    if (source instanceof HTMLVideoElement) return source
    return source.current
  }

  const start = performance.now()
  let el = read()
  while (!el && performance.now() - start < timeoutMs) {
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
    el = read()
  }
  if (!el) throw new Error('Video element never became available')
  return el
}

async function pickRearCameraConstraints(): Promise<MediaTrackConstraints> {
  let cams: MediaDeviceInfo[] = []
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    cams = devices.filter((d) => d.kind === 'videoinput')
  } catch {
    // enumeration may fail before getUserMedia permission — facingMode fallback still works
  }
  const rearCam = cams.find((d) => /back|rear|environment/i.test(d.label))

  return rearCam?.deviceId
    ? {
        deviceId: { exact: rearCam.deviceId },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }
    : {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      }
}

// Once the stream is live, push the track to its maximum reported resolution.
// This goes beyond the initial `ideal:1920` hint — e.g. iPhone 13+ can deliver
// 4032x3024, which roughly doubles the number of pixels per QR module and
// makes low-contrast green-on-navy prints measurably more decodable.
async function pushMaxResolution(track: MediaStreamTrack): Promise<void> {
  const caps = track.getCapabilities?.()
  if (!caps?.width?.max || !caps?.height?.max) return
  try {
    await track.applyConstraints({
      advanced: [
        {
          width: caps.width.max,
          height: caps.height.max,
        },
      ],
    })
  } catch {
    // Best-effort — browsers may reject an over-spec constraint set.
  }
}

/**
 * Start a QR scan against a <video> element.
 *
 * Strategy:
 *  1. Try native `BarcodeDetector` (iOS Safari 17+, Chrome). OS-level vision
 *     is usually more robust than zxing on marginal prints.
 *  2. Fall back to `@zxing/browser` with TRY_HARDER + QR_CODE hints.
 *
 * On first successful decode the controller auto-stops. Callers are
 * responsible for restarting via another `startQrScan` call.
 */
export async function startQrScan(
  videoSource: VideoElementSource,
  onResult: (text: string) => void
): Promise<QrScanController> {
  // Resolve the <video> element first — caller may invoke us in the same
  // tick as the state change that mounts it.
  const videoEl = await resolveVideoElement(videoSource)

  const videoConstraints = await pickRearCameraConstraints()
  const stream = await navigator.mediaDevices.getUserMedia({
    video: videoConstraints,
    audio: false,
  })

  videoEl.srcObject = stream
  videoEl.muted = true
  videoEl.setAttribute('playsinline', 'true')
  try {
    await videoEl.play()
  } catch {
    // Autoplay quirks — non-fatal, decoder still reads from the stream.
  }

  const track = stream.getVideoTracks()[0]
  // Best-effort max-resolution push. Don't await — some browsers (notably
  // iOS in-app webviews) can stall on applyConstraints, and the lower
  // initial resolution still beats a hung scanner.
  void pushMaxResolution(track)

  const torchCaps = track?.getCapabilities?.() as TorchCapabilities | undefined
  const torchSupported = !!torchCaps?.torch

  let stopped = false
  let rafId: number | null = null
  let zxingStop: (() => void) | null = null

  const stop = () => {
    if (stopped) return
    stopped = true
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    zxingStop?.()
    zxingStop = null
    stream.getTracks().forEach((t) => t.stop())
    if (videoEl.srcObject === stream) videoEl.srcObject = null
  }

  const setTorch = async (on: boolean) => {
    if (!torchSupported) return
    try {
      await track.applyConstraints({
        advanced: [{ torch: on } as MediaTrackConstraintSet & { torch: boolean }],
      })
    } catch (err) {
      console.warn('[qr-scan] torch toggle failed:', err)
    }
  }

  // Path 1: native BarcodeDetector
  const W = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  if (W.BarcodeDetector) {
    let detector: BarcodeDetectorInstance | null = null
    try {
      const formats = (await W.BarcodeDetector.getSupportedFormats?.()) ?? null
      if (!formats || formats.includes('qr_code')) {
        detector = new W.BarcodeDetector({ formats: ['qr_code'] })
      }
    } catch {
      detector = null
    }

    if (detector) {
      const tick = async () => {
        if (stopped) return
        try {
          if (videoEl.readyState >= 2 /* HAVE_CURRENT_DATA */) {
            const results = await detector.detect(videoEl)
            if (results.length && results[0].rawValue) {
              const text = results[0].rawValue
              stop()
              onResult(text)
              return
            }
          }
        } catch {
          // Skip frame — BarcodeDetector.detect can throw on decode-specific errors.
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)
      return { stop, torchSupported, setTorch }
    }
  }

  // Path 2: zxing fallback with TRY_HARDER
  const [{ BrowserQRCodeReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  const hints = new Map()
  hints.set(DecodeHintType.TRY_HARDER, true)
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
  const reader = new BrowserQRCodeReader(hints)

  const controls = await reader.decodeFromStream(stream, videoEl, (result) => {
    if (stopped || !result) return
    const text = result.getText()
    stop()
    onResult(text)
  })
  zxingStop = () => controls.stop()

  return { stop, torchSupported, setTorch }
}

function drawDownscaled(img: HTMLImageElement, maxSide: number): HTMLCanvasElement | null {
  const longest = Math.max(img.naturalWidth, img.naturalHeight)
  const scale = longest > maxSide ? maxSide / longest : 1
  const dw = Math.max(1, Math.round(img.naturalWidth * scale))
  const dh = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, dw, dh)
  return canvas
}

async function decodeViaServer(blob: Blob): Promise<string | null> {
  const formData = new FormData()
  formData.append('image', blob, 'photo.jpg')
  try {
    const res = await fetch('/api/v1/decode-qr', { method: 'POST', body: formData })
    if (!res.ok) return null
    const data = (await res.json()) as { text?: string; strategy?: string }
    if (data.text) {
      console.warn('[qr-scan/photo] server decoded', { strategy: data.strategy, len: data.text.length })
    }
    return data.text ?? null
  } catch (err) {
    console.warn('[qr-scan/photo] server decode failed', err)
    return null
  }
}

/**
 * Decode a QR code from a still image (file from camera or upload).
 *
 * Two-stage pipeline:
 *  1. Client BarcodeDetector on a 1500px downscale — fast, instant, works
 *     for normal-contrast prints (white-on-navy, black-on-white).
 *  2. If that returns nothing, POST the JPEG to /api/v1/decode-qr where
 *     ZBar (a battle-tested C library used by every Linux distro) runs
 *     a 7-strategy preprocessing pipeline. ZBar reads marginal prints
 *     that web detectors can't — including our green-on-navy label.
 *
 * Logs each stage with [qr-scan/photo] prefix for Safari Web Inspector
 * debugging from a USB-tethered iPhone.
 */
export async function decodeQrFromImage(file: Blob): Promise<string | null> {
  const log = (...args: unknown[]) => console.warn('[qr-scan/photo]', ...args)
  log('start', { type: file.type, size: file.size })

  // Load via HTMLImageElement — respects EXIF orientation in modern browsers.
  const url = URL.createObjectURL(file)
  let img: HTMLImageElement
  try {
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })
  } catch (err) {
    URL.revokeObjectURL(url)
    log('image load failed', err)
    return null
  }
  log('loaded', { w: img.naturalWidth, h: img.naturalHeight })

  const canvas = drawDownscaled(img, 1500)
  URL.revokeObjectURL(url)
  if (!canvas) {
    log('canvas alloc failed')
    return null
  }

  // Stage 1: client BarcodeDetector. Fast path for normal-contrast prints.
  const W = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  if (W.BarcodeDetector) {
    try {
      const formats = (await W.BarcodeDetector.getSupportedFormats?.()) ?? null
      if (!formats || formats.includes('qr_code')) {
        const detector = new W.BarcodeDetector({ formats: ['qr_code'] })
        const results = await detector.detect(canvas)
        if (results.length && results[0].rawValue) {
          log('decoded by client BarcodeDetector')
          return results[0].rawValue
        }
        log('BarcodeDetector found 0 codes — escalating to server')
      }
    } catch (err) {
      log('BarcodeDetector threw — escalating to server', err)
    }
  } else {
    log('BarcodeDetector unavailable — escalating to server')
  }

  // Stage 2: server-side ZBar via /api/v1/decode-qr.
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
  )
  if (!blob) {
    log('canvas.toBlob returned null')
    return null
  }
  log('uploading to server', { size: blob.size })
  return decodeViaServer(blob)
}
