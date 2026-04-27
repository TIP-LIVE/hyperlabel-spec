'use client'

import { useState, useCallback } from 'react'
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
import { ScanLine, Camera, CheckCircle, AlertCircle, Keyboard } from 'lucide-react'
import { toast } from 'sonner'
import { extractDeviceId } from '@/lib/extract-device-id'
import { decodeQrFromImage } from '@/lib/qr-scan'
import { PhotoCaptureButton } from '@/components/shared/photo-capture-button'

interface QrScannerProps {
  onDeviceIdScanned: (deviceId: string) => void
}

/**
 * Photo-capture QR reader for tracking labels. Mobile uses the native camera
 * via `<input capture>`; desktop opens an in-app webcam preview with a
 * manual shutter. Either path produces a still photo, decoded via the
 * two-stage pipeline (client BarcodeDetector → server ZBar). Live
 * continuous scanning was removed — the still-photo path is more reliable
 * for low-contrast green-on-navy printed labels, and admin flows had
 * already standardized on it.
 */
export function QrScanner({ onDeviceIdScanned }: QrScannerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'photo' | 'manual'>('photo')
  const [manualId, setManualId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [scannedValue, setScannedValue] = useState<string | null>(null)
  const [decodingPhoto, setDecodingPhoto] = useState(false)

  const handleScannedId = useCallback(
    (deviceId: string) => {
      setScannedValue(deviceId)
      setTimeout(() => {
        onDeviceIdScanned(deviceId)
        setOpen(false)
        setScannedValue(null)
        toast.success(`Label ${deviceId} scanned successfully!`)
      }, 1000)
    },
    [onDeviceIdScanned]
  )

  const handlePhoto = useCallback(
    async (file: Blob) => {
      if (file.size === 0) {
        setError('Photo was empty (0 bytes). Try again.')
        return
      }
      setError(null)
      setDecodingPhoto(true)
      try {
        const result = await decodeQrFromImage(file)
        if (!result.text) {
          if (result.reason === 'server-error') {
            setError(`Server decode failed (HTTP ${result.serverStatus}). Try again.`)
          } else {
            setError(
              'No QR code found in the photo. Hold the camera 10–20 cm from the label so the QR fills the frame.'
            )
          }
          return
        }
        const scannedDeviceId = extractDeviceId(result.text)
        if (!scannedDeviceId) {
          setError('Photo decoded, but the QR did not contain a label ID.')
          return
        }
        handleScannedId(scannedDeviceId)
      } catch {
        setError('Could not decode the photo. Try again.')
      } finally {
        setDecodingPhoto(false)
      }
    },
    [handleScannedId]
  )

  const handleManualSubmit = useCallback(() => {
    const id = manualId.trim().toUpperCase()
    if (!id.match(/^(\d{9}|TIP-\d+|HL-\d{6})$/)) {
      setError(
        'Invalid label ID. Use a 9-digit label ID (e.g. 002011395) or the legacy TIP-001 / HL-001234 format.'
      )
      return
    }
    handleScannedId(id)
    setManualId('')
  }, [manualId, handleScannedId])

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setError(null)
      setScannedValue(null)
      setMode('photo')
      setManualId('')
    }
  }, [])

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
            Take a photo of the QR code on your tracking label, or enter the device ID manually.
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'photo' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => {
              setMode('photo')
              setError(null)
            }}
          >
            <Camera className="h-3.5 w-3.5" />
            Photo
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => {
              setMode('manual')
              setError(null)
            }}
          >
            <Keyboard className="h-3.5 w-3.5" />
            Manual
          </Button>
        </div>

        {scannedValue ? (
          <div className="flex flex-col items-center justify-center rounded-lg border bg-muted py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-3 font-mono text-lg font-medium">{scannedValue}</p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-400">Label scanned!</p>
          </div>
        ) : mode === 'photo' ? (
          <div className="space-y-2">
            <PhotoCaptureButton
              onPhoto={handlePhoto}
              label={decodingPhoto ? 'Reading photo…' : 'Take photo of QR'}
              disabled={decodingPhoto}
              className="w-full gap-1.5"
            />
            <p className="text-xs text-muted-foreground">
              Hold the camera 10–20 cm from the label so the QR fills the frame.
            </p>
          </div>
        ) : (
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
              The label ID is printed under the QR code on your tracking label (e.g. 002011395, TIP-001
              or HL-001234).
            </p>
          </div>
        )}

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
