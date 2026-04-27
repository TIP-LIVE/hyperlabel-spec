'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, Loader2, AlertCircle } from 'lucide-react'
import { startWebcamPreview, captureSnapshot } from '@/lib/qr-scan'

interface PhotoCaptureButtonProps {
  /** Called with the captured photo (mobile File or desktop Blob from canvas). */
  onPhoto: (file: Blob) => void
  /** Button label. */
  label?: string
  disabled?: boolean
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  className?: string
}

const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Camera button that takes a single still photo and hands it to the caller
 * for decoding. On mobile (`<input capture>` opens the system camera), we
 * use the file-input path because native camera UIs are higher-resolution
 * and more reliable for low-contrast prints. On desktop (where `capture`
 * silently falls back to a file picker), we open a webcam preview dialog
 * with a manual shutter button.
 */
export function PhotoCaptureButton({
  onPhoto,
  label = 'Take photo',
  disabled,
  variant = 'default',
  className,
}: PhotoCaptureButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [webcamOpen, setWebcamOpen] = useState(false)
  const useNativeCamera = useMemo(isMobileDevice, [])

  const handleClick = useCallback(() => {
    if (useNativeCamera) {
      fileInputRef.current?.click()
    } else {
      setWebcamOpen(true)
    }
  }, [useNativeCamera])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      onPhoto(file)
    },
    [onPhoto]
  )

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant={variant}
        onClick={handleClick}
        disabled={disabled}
        className={className}
      >
        <Camera className="h-4 w-4" />
        {label}
      </Button>
      <WebcamSnapshotDialog
        open={webcamOpen}
        onOpenChange={setWebcamOpen}
        onPhoto={(blob) => {
          setWebcamOpen(false)
          onPhoto(blob)
        }}
      />
    </>
  )
}

interface WebcamSnapshotDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPhoto: (blob: Blob) => void
}

function WebcamSnapshotDialog({ open, onOpenChange, onPhoto }: WebcamSnapshotDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!open) {
      stopRef.current?.()
      stopRef.current = null
      setReady(false)
      setError(null)
      setCapturing(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { stop } = await startWebcamPreview(videoRef)
        if (cancelled) {
          stop()
          return
        }
        stopRef.current = stop
        setReady(true)
      } catch (err) {
        if (cancelled) return
        const name = err instanceof Error ? err.name : ''
        setError(
          name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access in browser settings.'
            : 'Could not access the camera.'
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open])

  const takePhoto = useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    setCapturing(true)
    try {
      const blob = await captureSnapshot(video)
      onPhoto(blob)
    } catch (err) {
      console.error('[photo-capture] snapshot failed', err)
      setError('Could not capture photo. Try again.')
      setCapturing(false)
    }
  }, [onPhoto])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Take photo of QR</DialogTitle>
          <DialogDescription>
            Aim the camera so the QR fills the frame, then tap Take photo.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            playsInline
            muted
          />
          {!ready && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-white/50" />
              <p className="mt-2 text-sm text-white/50">Starting camera...</p>
            </div>
          )}
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Button
          type="button"
          onClick={takePhoto}
          disabled={!ready || capturing || !!error}
          className="w-full gap-2"
        >
          {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {capturing ? 'Capturing…' : 'Take photo'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
