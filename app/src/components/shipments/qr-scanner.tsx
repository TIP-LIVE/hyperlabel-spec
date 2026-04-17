'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScanLine, Camera, Loader2, CheckCircle, AlertCircle, Keyboard } from 'lucide-react'
import { toast } from 'sonner'
import { extractDeviceId } from '@/lib/extract-device-id'
import type { IScannerControls } from '@zxing/browser'

interface QrScannerProps {
  onDeviceIdScanned: (deviceId: string) => void
}

// Check camera support eagerly (client-only component)
const checkCameraSupport = () => {
  if (typeof navigator === 'undefined') return false
  return !!navigator.mediaDevices?.getUserMedia
}

export function QrScanner({ onDeviceIdScanned }: QrScannerProps) {
  const cameraSupported = checkCameraSupport()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'scanner' | 'manual'>(cameraSupported ? 'scanner' : 'manual')
  const [scanning, setScanning] = useState(false)
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scannedValue, setScannedValue] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scannerControlsRef = useRef<IScannerControls | null>(null)

  // extractDeviceId is now imported from @/lib/extract-device-id

  // Stop camera
  const stopCamera = useCallback(() => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop()
      scannerControlsRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScanning(false)
  }, [])

  // Unconditional cleanup if the component unmounts while scanning — e.g.
  // user navigates away with the dialog still open. Without this, the
  // camera LED stays on and the stream keeps decoding in the background.
  useEffect(() => {
    return () => {
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop()
        scannerControlsRef.current = null
      }
    }
  }, [])

  // Handle scanned device ID
  const handleScannedId = useCallback(
    (deviceId: string) => {
      setScannedValue(deviceId)
      stopCamera()
      setTimeout(() => {
        onDeviceIdScanned(deviceId)
        setOpen(false)
        setScannedValue(null)
        toast.success(`Label ${deviceId} scanned successfully!`)
      }, 1000)
    },
    [onDeviceIdScanned, stopCamera]
  )

  // Start camera and scanning
  const startScanning = useCallback(async () => {
    setError(null)
    setScanning(true)
    setScannedValue(null)

    try {
      // Lazy-load zxing only when the user actually opens the camera.
      // The awaits here also give React time to mount the <video> element.
      const { BrowserQRCodeReader } = await import('@zxing/browser')
      const reader = new BrowserQRCodeReader()

      // Prefer the rear camera when available (iOS Safari labels may be empty
      // until permission is granted — in that case fall back to the first device
      // and the browser still honors facingMode: environment on most devices).
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      const rearCam = devices.find((d) => /back|rear|environment/i.test(d.label))
      const deviceId = rearCam?.deviceId ?? devices[0]?.deviceId

      if (!videoRef.current) {
        setScanning(false)
        return
      }

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (result, _err, ctrl) => {
          if (!result) return
          const scannedDeviceId = extractDeviceId(result.getText())
          if (scannedDeviceId) {
            ctrl.stop()
            scannerControlsRef.current = null
            handleScannedId(scannedDeviceId)
          }
        }
      )
      scannerControlsRef.current = controls
    } catch (err) {
      console.error('Camera error:', err)
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError') {
        setError('Camera permission denied. Enable it in browser settings or enter the device ID manually.')
      } else {
        setError('Could not access camera. Please check permissions or enter the device ID manually.')
      }
      setScanning(false)
      setMode('manual')
    }
  }, [handleScannedId])

  // Handle manual entry — accepts the new 9-digit displayId (e.g. 002011395)
  // or the legacy TIP-001 / HL-001234 format.
  const handleManualSubmit = useCallback(() => {
    const id = manualId.trim().toUpperCase()
    if (!id.match(/^(\d{9}|TIP-\d+|HL-\d{6})$/)) {
      setError('Invalid label ID. Use a 9-digit label ID (e.g. 002011395) or the legacy TIP-001 / HL-001234 format.')
      return
    }
    handleScannedId(id)
    setManualId('')
  }, [manualId, handleScannedId])

  // Handle dialog open/close — avoids setState in effects
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen)
      if (!isOpen) {
        // Cleanup on close
        stopCamera()
        setError(null)
        setScannedValue(null)
        setMode(cameraSupported ? 'scanner' : 'manual')
      } else if (cameraSupported) {
        // Auto-start scanning on open
        startScanning()
      }
    },
    [stopCamera, cameraSupported, startScanning]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <ScanLine className="h-4 w-4" />
          Scan QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Label QR Code</DialogTitle>
          <DialogDescription>
            Point your camera at the QR code on your tracking label, or enter the device ID manually.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        {cameraSupported && (
          <div className="flex gap-2">
            <Button
              variant={mode === 'scanner' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => {
                setMode('scanner')
                setError(null)
                if (!scanning) startScanning()
              }}
            >
              <Camera className="h-3.5 w-3.5" />
              Camera
            </Button>
            <Button
              variant={mode === 'manual' ? 'default' : 'outline'}
              size="sm"
              className="flex-1 gap-1.5"
              onClick={() => {
                setMode('manual')
                stopCamera()
              }}
            >
              <Keyboard className="h-3.5 w-3.5" />
              Manual
            </Button>
          </div>
        )}

        {/* Scanner view */}
        {mode === 'scanner' && (
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
            {scannedValue ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <p className="mt-4 font-mono text-lg text-white">{scannedValue}</p>
                <p className="mt-1 text-sm text-green-400">Label scanned!</p>
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
                    {/* Scanning overlay */}
                    <div className="h-48 w-48 rounded-lg border-2 border-white/70 sm:h-56 sm:w-56">
                      {/* Animated scan line */}
                      <div className="h-full w-full animate-pulse rounded-lg border-2 border-primary/60" />
                    </div>
                  </div>
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
        )}

        {/* Manual entry view */}
        {mode === 'manual' && (
          <div className="space-y-4">
            {scannedValue ? (
              <div className="flex flex-col items-center justify-center rounded-lg border bg-muted py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <p className="mt-3 font-mono text-lg font-medium">{scannedValue}</p>
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">Label found!</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="deviceId">Label ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="deviceId"
                      placeholder="002011395 or TIP-001"
                      value={manualId}
                      onChange={(e) => {
                        setManualId(e.target.value)
                        setError(null)
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                      className="font-mono"
                    />
                    <Button onClick={handleManualSubmit} disabled={!manualId.trim()}>
                      Go
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The label ID is printed under the QR code on your tracking label (e.g. 002011395, TIP-001 or HL-001234).
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Error message */}
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
