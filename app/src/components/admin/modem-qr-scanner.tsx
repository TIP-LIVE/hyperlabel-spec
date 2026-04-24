'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScanLine, Camera, Loader2, CheckCircle, AlertCircle, Flashlight, FlashlightOff } from 'lucide-react'
import { startQrScan, type QrScanController } from '@/lib/qr-scan'

interface ModemQrScannerProps {
  /** Called with the raw scanned text, e.g. "P/N:...;IMEI:...;SW:..." */
  onScanned: (rawText: string) => void
  /** Optional trigger label; defaults to "Scan with camera". */
  triggerLabel?: string
}

const checkCameraSupport = () => {
  if (typeof navigator === 'undefined') return false
  return !!navigator.mediaDevices?.getUserMedia
}

/**
 * Camera-based QR scanner for modem QR codes. Unlike the shipments scanner
 * (which extracts TIP-XXX / HL-XXXXXX device IDs), this one forwards the raw
 * scanned text to the parent via `onScanned` — the parent is responsible for
 * parsing with `parseModemQr`.
 *
 * Uses @zxing/browser so iOS Safari (which lacks BarcodeDetector) still gets
 * the camera option. Falls back gracefully: if getUserMedia is unavailable
 * the button is disabled, and the parent form's text input is still there.
 */
export function ModemQrScanner({ onScanned, triggerLabel = 'Scan with camera' }: ModemQrScannerProps) {
  const [open, setOpen] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedValue, setScannedValue] = useState<string | null>(null)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controllerRef = useRef<QrScanController | null>(null)

  const cameraSupported = checkCameraSupport()

  const stopCamera = useCallback(() => {
    controllerRef.current?.stop()
    controllerRef.current = null
    setTorchSupported(false)
    setTorchOn(false)
    setScanning(false)
  }, [])

  // Unmount safety: handleOpenChange only fires on dialog close, not on
  // parent unmount, so the stream would otherwise leak.
  useEffect(() => {
    return () => {
      controllerRef.current?.stop()
      controllerRef.current = null
    }
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

    try {
      if (!videoRef.current) {
        setScanning(false)
        return
      }

      const controller = await startQrScan(videoRef.current, (rawValue) => {
        if (rawValue) {
          controllerRef.current = null
          handleRawScanned(rawValue)
        }
      })
      controllerRef.current = controller
      if (controller.torchSupported) setTorchSupported(true)
    } catch (err) {
      console.error('[modem-qr-scanner] camera error:', err)
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError') {
        setError('Camera permission denied. Enable it in browser settings or paste the QR text instead.')
      } else {
        setError('Could not access the camera. Check permissions and try again, or paste the QR text.')
      }
      setScanning(false)
    }
  }, [handleRawScanned])

  const toggleTorch = useCallback(async () => {
    const next = !torchOn
    await controllerRef.current?.setTorch(next)
    setTorchOn(next)
  }, [torchOn])

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

        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
          {scannedValue ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
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
                className="absolute inset-0 h-full w-full object-cover"
                playsInline
                muted
              />
              {scanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-lg border-2 border-white/70 sm:h-56 sm:w-56">
                    <div className="h-full w-full animate-pulse rounded-lg border-2 border-primary/60" />
                  </div>
                </div>
              )}
              {scanning && torchSupported && (
                <Button
                  type="button"
                  size="sm"
                  variant={torchOn ? 'default' : 'secondary'}
                  onClick={toggleTorch}
                  className="absolute bottom-3 right-3 gap-1.5"
                >
                  {torchOn ? <Flashlight className="h-3.5 w-3.5" /> : <FlashlightOff className="h-3.5 w-3.5" />}
                  {torchOn ? 'Flash on' : 'Flash'}
                </Button>
              )}
              {!scanning && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
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
