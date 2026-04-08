'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScanLine, Camera, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

interface ModemQrScannerProps {
  /** Called with the raw scanned text, e.g. "P/N:...;IMEI:...;SW:..." */
  onScanned: (rawText: string) => void
  /** Optional trigger label; defaults to "Scan with camera". */
  triggerLabel?: string
}

// BarcodeDetector type augmentation (matches shipments/qr-scanner.tsx)
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
    }
  }
}

const checkCameraSupport = () => {
  if (typeof navigator === 'undefined') return false
  return !!navigator.mediaDevices?.getUserMedia && !!window.BarcodeDetector
}

/**
 * Camera-based QR scanner for modem QR codes. Unlike the shipments scanner
 * (which extracts TIP-XXX / HL-XXXXXX device IDs), this one forwards the raw
 * scanned text to the parent via `onScanned` — the parent is responsible for
 * parsing with `parseModemQr`.
 *
 * Falls back gracefully: if BarcodeDetector or getUserMedia is unavailable,
 * the parent form's text input is still there.
 */
export function ModemQrScanner({ onScanned, triggerLabel = 'Scan with camera' }: ModemQrScannerProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedValue, setScannedValue] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  const cameraSupported = checkCameraSupport()

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }, [])

  const handleRawScanned = useCallback(
    (rawText: string) => {
      setScannedValue(rawText)
      stopCamera()
      // Give the user a beat to see the confirmation, then close + emit.
      setTimeout(() => {
        onScanned(rawText)
        setOpen(false)
        setScannedValue(null)
      }, 800)
    },
    [onScanned, stopCamera]
  )

  const startScanning = useCallback(async () => {
    setError(null)
    setScanning(true)
    setScannedValue(null)

    if (!window.BarcodeDetector) {
      setError('QR scanning is not supported in this browser. Paste the QR text instead.')
      setScanning(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue
            if (rawValue) {
              handleRawScanned(rawValue)
              return
            }
          }
        } catch {
          // Detection failed for this frame, keep trying
        }
        animationRef.current = requestAnimationFrame(scanFrame)
      }
      animationRef.current = requestAnimationFrame(scanFrame)
    } catch (err) {
      console.error('[modem-qr-scanner] camera error:', err)
      setError(
        'Could not access the camera. Check permissions and try again, or paste the QR text.'
      )
      setScanning(false)
    }
  }, [handleRawScanned])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) {
        stopCamera()
        setError(null)
        setScannedValue(null)
      } else {
        startScanning()
      }
    },
    [stopCamera, startScanning]
  )

  if (!cameraSupported) {
    return (
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled
        title="Camera scanning not supported in this browser"
      >
        <Camera className="h-4 w-4" />
        {triggerLabel}
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <ScanLine className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan modem QR code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code printed on the modem PCB. The raw text
            will be parsed for the IMEI and firmware version.
          </DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden rounded-lg bg-black">
          {scannedValue ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-10 w-10 text-green-400" />
              </div>
              <p className="mt-4 max-w-full break-all text-center font-mono text-xs text-white">
                {scannedValue}
              </p>
              <p className="mt-2 text-sm text-green-400">QR captured!</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="aspect-square w-full object-cover"
                playsInline
                muted
              />
              {scanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-lg border-2 border-white/50">
                    <div className="h-full w-full animate-pulse rounded-lg border-2 border-primary/50" />
                  </div>
                </div>
              )}
              {!scanning && !error && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                  <p className="mt-2 text-sm text-white/50">Starting camera...</p>
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
