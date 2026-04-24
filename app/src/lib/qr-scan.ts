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

/**
 * Stretch luminance to fill 0–255 and convert to grayscale in place.
 *
 * Why: our printed labels use bright green (#66FF00) on dark navy. Both
 * colors sit in a narrow luminance band that BarcodeDetector and zxing's
 * HybridBinarizer struggle to threshold. After a global histogram stretch,
 * the green modules become near-white and the navy background near-black —
 * what the QR spec assumes.
 */
function enhanceContrast(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data

  let min = 255
  let max = 0
  // First pass: convert to grayscale + find min/max luminance
  const gray = new Uint8Array(canvas.width * canvas.height)
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const g = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0
    gray[j] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = max - min
  if (range < 8) return // nearly uniform image — stretching would amplify noise

  // Second pass: write stretched grayscale back as RGB
  const scale = 255 / range
  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    const v = ((gray[j] - min) * scale) | 0
    data[i] = v
    data[i + 1] = v
    data[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
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

async function detectOnCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  // Path 1: native BarcodeDetector
  const W = window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }
  if (W.BarcodeDetector) {
    try {
      const formats = (await W.BarcodeDetector.getSupportedFormats?.()) ?? null
      if (!formats || formats.includes('qr_code')) {
        const detector = new W.BarcodeDetector({ formats: ['qr_code'] })
        const results = await detector.detect(canvas)
        if (results.length && results[0].rawValue) return results[0].rawValue
      }
    } catch {
      // Fall through to zxing
    }
  }

  // Path 2: zxing via canvas → JPEG (smaller than PNG, easier on memory).
  try {
    const [{ BrowserQRCodeReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library'),
    ])
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
    const reader = new BrowserQRCodeReader(hints)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const result = await reader.decodeFromImageUrl(dataUrl)
    return result.getText()
  } catch {
    return null
  }
}

/**
 * Decode a QR code from a still image (file from camera or upload).
 *
 * Tries multiple strategies in sequence:
 *  - Three downscale sizes (1500/1000/750 px on the longest side). Larger
 *    keeps detail but bloats the dataURL; smaller forces the binarizer to
 *    work on chunkier pixels which sometimes finds finder patterns the
 *    full-res scan misses.
 *  - With and without a global luminance stretch (helps low-contrast
 *    prints like our green-on-navy labels).
 *  - Each variant runs through BarcodeDetector → zxing.
 *
 * First success wins. Logs each attempt with the [qr-scan/photo] prefix
 * so failures can be inspected via Safari Web Inspector.
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

  // Strategy matrix. Order matters: cheap-and-likely first.
  const sizes = [1500, 1000, 750]
  const enhanceModes = [false, true]

  for (const size of sizes) {
    for (const enhance of enhanceModes) {
      const canvas = drawDownscaled(img, size)
      if (!canvas) continue
      if (enhance) enhanceContrast(canvas)
      const found = await detectOnCanvas(canvas)
      log('attempt', { size, enhance, found: !!found })
      if (found) {
        URL.revokeObjectURL(url)
        return found
      }
    }
  }

  URL.revokeObjectURL(url)
  log('all strategies failed')
  return null
}
