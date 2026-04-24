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
  videoEl: HTMLVideoElement,
  onResult: (text: string) => void
): Promise<QrScanController> {
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
  await pushMaxResolution(track)

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
