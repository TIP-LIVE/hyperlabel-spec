'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { decodeQrFromImage } from '@/lib/qr-scan'

interface ModemQrScannerProps {
  /** Called with the raw scanned text, e.g. "P/N:...;IMEI:...;SW:..." */
  onScanned: (rawText: string) => void
  /** Optional trigger label; defaults to "Scan with camera". */
  triggerLabel?: string
}

/**
 * Photo-capture QR reader for modem QR codes. Opens the device's native
 * camera via `<input capture="environment">`, then decodes the captured
 * image server-side. Live WebRTC scanning was removed because the
 * still-photo path is more reliable on iOS for low-contrast PCB prints.
 */
export function ModemQrScanner({ onScanned, triggerLabel = 'Scan with camera' }: ModemQrScannerProps) {
  const [decoding, setDecoding] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // allow re-selecting the same file later
      if (!file) return
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
    <>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoSelected}
      />
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => photoInputRef.current?.click()}
        disabled={decoding}
      >
        {decoding ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
        {triggerLabel}
      </Button>
    </>
  )
}
