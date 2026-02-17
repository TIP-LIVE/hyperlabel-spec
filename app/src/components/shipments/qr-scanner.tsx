'use client'

import { useState, useRef, useCallback } from 'react'
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

interface QrScannerProps {
  onDeviceIdScanned: (deviceId: string) => void
}

// Extend Window for BarcodeDetector support check
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
    }
  }
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
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)

  // Extract device ID from QR data (could be URL or just device ID)
  const extractDeviceId = useCallback((data: string): string | null => {
    // Direct device ID: TIP-001, TIP-123, or HL-001234
    const tipMatch = data.match(/TIP-\d+/i)
    if (tipMatch) return tipMatch[0].toUpperCase()
    const hlMatch = data.match(/HL-\d{6}/i)
    if (hlMatch) return hlMatch[0].toUpperCase()

    // URL format: https://tip.live/activate/TIP-001 or ?deviceId=TIP-001
    try {
      const url = new URL(data)
      const pathTip = url.pathname.match(/TIP-\d+/i)
      if (pathTip) return pathTip[0].toUpperCase()
      const pathHl = url.pathname.match(/HL-\d{6}/i)
      if (pathHl) return pathHl[0].toUpperCase()
      const param = url.searchParams.get('deviceId')
      if (param) return param.trim().toUpperCase()
    } catch {
      // Not a URL, ignore
    }

    return null
  }, [])

  // Stop camera
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Try using BarcodeDetector API
      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              const deviceId = extractDeviceId(barcodes[0].rawValue)
              if (deviceId) {
                handleScannedId(deviceId)
                return
              }
            }
          } catch {
            // Detection failed for this frame, continue
          }
          animationRef.current = requestAnimationFrame(scanFrame)
        }
        animationRef.current = requestAnimationFrame(scanFrame)
      } else {
        // BarcodeDetector not available — show camera view with manual fallback
        setError('QR scanning not supported in this browser. Enter the device ID manually.')
        setMode('manual')
        stopCamera()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setError('Could not access camera. Please check permissions or enter the device ID manually.')
      setScanning(false)
      setMode('manual')
    }
  }, [extractDeviceId, handleScannedId, stopCamera])

  // Handle manual entry (TIP-001, TIP-123, or HL-001234)
  const handleManualSubmit = useCallback(() => {
    const id = manualId.trim().toUpperCase()
    if (!id.match(/^(TIP-\d+|HL-\d{6})$/)) {
      setError('Invalid device ID. Use TIP-001 or HL-001234 format.')
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
              onClick={() => setMode('scanner')}
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
          <div className="relative overflow-hidden rounded-lg bg-black">
            {scannedValue ? (
              <div className="flex flex-col items-center justify-center py-12">
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
                  className="aspect-square w-full object-cover"
                  playsInline
                  muted
                />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Scanning overlay */}
                    <div className="h-48 w-48 rounded-lg border-2 border-white/50">
                      {/* Animated scan line */}
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
                  <Label htmlFor="deviceId">Device ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="deviceId"
                      placeholder="TIP-001 or HL-001234"
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
                    The device ID is printed on the back of your tracking label (e.g., TIP-001 or HL-001234)
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
