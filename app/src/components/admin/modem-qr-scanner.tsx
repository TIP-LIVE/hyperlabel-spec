'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { decodeQrFromImage } from '@/lib/qr-scan'
import { PhotoCaptureButton } from '@/components/shared/photo-capture-button'

interface ModemQrScannerProps {
  /** Called with the raw scanned text, e.g. "P/N:...;IMEI:...;SW:..." */
  onScanned: (rawText: string) => void
  /** Optional trigger label; defaults to "Scan with camera". */
  triggerLabel?: string
}

/**
 * Photo-capture QR reader for modem QR codes. Mobile uses the native camera
 * via `<input capture>`; desktop opens an in-app webcam preview with a
 * manual shutter. Either path produces a still photo, which is decoded
 * server-side. Live continuous scanning was removed because the still-photo
 * path is more reliable for low-contrast PCB prints.
 */
export function ModemQrScanner({ onScanned, triggerLabel = 'Scan with camera' }: ModemQrScannerProps) {
  const [decoding, setDecoding] = useState(false)

  const handlePhoto = useCallback(
    async (file: Blob) => {
      if (file.size === 0) {
        toast.error('Photo was empty (0 bytes). Try again.')
        return
      }
      setDecoding(true)
      try {
        const result = await decodeQrFromImage(file)
        if (result.text) {
          onScanned(result.text)
          return
        }
        if (result.reason === 'server-error') {
          toast.error(`Server decode failed (HTTP ${result.serverStatus}). Try again.`)
        } else {
          toast.error('No QR found. Hold the camera 10–20 cm from the label so the QR fills the frame.')
        }
      } catch {
        toast.error('Could not decode the photo. Try again.')
      } finally {
        setDecoding(false)
      }
    },
    [onScanned]
  )

  return (
    <PhotoCaptureButton
      onPhoto={handlePhoto}
      label={decoding ? 'Reading photo…' : triggerLabel}
      disabled={decoding}
      variant="outline"
      className="gap-2"
    />
  )
}
