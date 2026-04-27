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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  ScanLine,
  Camera,
  Keyboard,
  Loader2,
  AlertCircle,
  Package,
  List,
  Search,
  Flashlight,
  FlashlightOff,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { extractDeviceId } from '@/lib/extract-device-id'
import { ScannedLabelRow } from './scanned-label-row'
import { startQrScan, decodeQrFromImage, type QrScanController } from '@/lib/qr-scan'

interface ScannedLabel {
  labelId: string
  deviceId: string
  displayId: string
  iccid: string
}

interface LabelScanDialogProps {
  shipmentId: string
  shipmentName: string | null
  labelCount: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
}

interface AvailableLabel {
  id: string
  deviceId: string
  displayId: string | null
  iccid: string | null
  status: string
  batteryPct: number | null
}

type ScanStep = 'scan' | 'iccid'

const checkCameraSupport = () => {
  if (typeof navigator === 'undefined') return false
  return !!navigator.mediaDevices?.getUserMedia
}

export function LabelScanDialog({
  shipmentId,
  shipmentName,
  labelCount,
  open,
  onOpenChange,
  onConfirmed,
}: LabelScanDialogProps) {
  const cameraSupported = checkCameraSupport()

  const [scannedLabels, setScannedLabels] = useState<ScannedLabel[]>([])
  const [step, setStep] = useState<ScanStep>('scan')
  const [mode, setMode] = useState<'camera' | 'manual' | 'browse'>('browse')
  const [scanning, setScanning] = useState(false)
  const [manualId, setManualId] = useState('')
  const [scanError, setScanError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)

  // Current label being linked (after QR scan, before ICCID entry)
  const [pendingLabel, setPendingLabel] = useState<{
    id: string
    deviceId: string
    displayId: string
    existingIccid: string | null
  } | null>(null)
  const [iccidValue, setIccidValue] = useState('')

  // Browse mode state
  const [availableLabels, setAvailableLabels] = useState<AvailableLabel[]>([])
  const [browseFilter, setBrowseFilter] = useState('')
  const [loadingBrowse, setLoadingBrowse] = useState(false)

  // Torch support (Chrome Android only)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  // Still-photo fallback (native camera via <input capture>) for when the
  // live WebRTC stream can't decode a low-contrast print.
  const [decodingPhoto, setDecodingPhoto] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const controllerRef = useRef<QrScanController | null>(null)
  const iccidInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  // Ref-indirection so lookupLabel (defined earlier in the file) can call
  // startScanning (defined later) without a TDZ on the dependency array.
  const startScanningRef = useRef<(() => Promise<void>) | null>(null)

  const stopCamera = useCallback(() => {
    controllerRef.current?.stop()
    controllerRef.current = null
    setTorchSupported(false)
    setTorchOn(false)
    setScanning(false)
  }, [])

  const resetDialog = useCallback(() => {
    stopCamera()
    setScannedLabels([])
    setStep('scan')
    setMode('browse')
    setManualId('')
    setScanError(null)
    setPendingLabel(null)
    setIccidValue('')
    setIsSubmitting(false)
    setLookingUp(false)
    setAvailableLabels([])
    setBrowseFilter('')
    setLoadingBrowse(false)
  }, [stopCamera])

  // Look up a label by deviceId/displayId
  const lookupLabel = useCallback(
    async (deviceIdOrDisplayId: string) => {
      setScanError(null)
      setLookingUp(true)

      // Check if already scanned
      if (scannedLabels.some((sl) => sl.displayId === deviceIdOrDisplayId || sl.deviceId === deviceIdOrDisplayId)) {
        setScanError('This label has already been scanned.')
        setLookingUp(false)
        return
      }

      try {
        // Pass shipmentId so labels already pre-linked to *this* dispatch
        // aren't rejected — verify-labels replaces the linked set atomically
        // on confirm, so re-scanning them is legal.
        const res = await fetch(
          `/api/v1/labels/lookup?q=${encodeURIComponent(deviceIdOrDisplayId)}&shipmentId=${encodeURIComponent(shipmentId)}`
        )
        const data = await res.json()

        if (!res.ok) {
          setScanError(data.error || 'Label not found')
          setLookingUp(false)
          return
        }

        const displayId = data.label.displayId || data.label.deviceId

        // Fast path: label already has an ICCID on file (set during
        // manufacturing/SIM pairing). Add directly without forcing the user
        // to retype it. They can still remove + redo if the SIM was swapped.
        if (data.label.iccid) {
          setScannedLabels((prev) => [
            ...prev,
            {
              labelId: data.label.id,
              deviceId: data.label.deviceId,
              displayId,
              iccid: data.label.iccid,
            },
          ])
          setStep('scan')
          // Restart camera in camera mode so the next QR can be scanned
          if (mode === 'camera' && cameraSupported) {
            setTimeout(() => startScanningRef.current?.(), 200)
          }
          return
        }

        // No ICCID on file — ask the user to type the one printed on the SIM tray.
        setPendingLabel({
          id: data.label.id,
          deviceId: data.label.deviceId,
          displayId,
          existingIccid: data.label.iccid,
        })
        setIccidValue('')
        setStep('iccid')
        stopCamera()

        // Auto-focus ICCID input after render
        setTimeout(() => iccidInputRef.current?.focus(), 100)
      } catch {
        setScanError('Failed to look up label. Please try again.')
      } finally {
        setLookingUp(false)
      }
    },
    [scannedLabels, stopCamera, shipmentId, mode, cameraSupported]
  )

  // Handle a scanned QR value
  const handleQrScanned = useCallback(
    (rawValue: string) => {
      const deviceId = extractDeviceId(rawValue)
      if (!deviceId) {
        setScanError('Could not extract a label ID from the scanned QR code.')
        return
      }
      lookupLabel(deviceId)
    },
    [lookupLabel]
  )

  // Start camera scanning
  const startScanning = useCallback(async () => {
    setScanError(null)
    setScanning(true)

    try {
      const controller = await startQrScan(videoRef, (rawValue) => {
        controllerRef.current = null
        handleQrScanned(rawValue)
      })
      controllerRef.current = controller
      if (controller.torchSupported) setTorchSupported(true)
    } catch (err) {
      const name = err instanceof Error ? err.name : ''
      if (name === 'NotAllowedError') {
        setScanError('Camera permission denied. Enable it in browser settings or use manual entry.')
      } else {
        setScanError('Could not access camera. Check permissions or use manual entry.')
      }
      setScanning(false)
      setMode('manual')
    }
  }, [handleQrScanned])

  // Keep ref in sync so lookupLabel (defined earlier) can call latest startScanning
  useEffect(() => {
    startScanningRef.current = startScanning
  }, [startScanning])

  const toggleTorch = useCallback(async () => {
    const next = !torchOn
    await controllerRef.current?.setTorch(next)
    setTorchOn(next)
  }, [torchOn])

  // Still-photo fallback. Native camera capture gives a full-res JPEG that
  // sidesteps the WebRTC quality cap — useful for low-contrast prints.
  // Chatty toasts/logs so iOS-side failures (in-app browser quirks, missing
  // change events, empty files, etc.) are visible without a debugger.
  const handlePhotoSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files
      console.warn('[scan-dialog] photo change event', { count: fileList?.length ?? 0 })
      const file = fileList?.[0]
      e.target.value = '' // allow re-selecting the same file later
      if (!file) {
        toast.error('No photo received from the camera.')
        return
      }
      console.warn('[scan-dialog] photo file', { name: file.name, type: file.type, size: file.size })
      if (file.size === 0) {
        toast.error('Photo was empty (0 bytes). Try again.')
        return
      }
      toast.info('Reading photo…')
      setScanError(null)
      setDecodingPhoto(true)
      stopCamera()
      let decoded = false
      try {
        const result = await decodeQrFromImage(file)
        console.warn('[scan-dialog] decode result', result)
        if (result.text) {
          decoded = true
          toast.success(
            `Decoded${result.strategy ? ` via ${result.strategy}` : ''}: ${
              result.text.length > 30 ? result.text.slice(0, 30) + '…' : result.text
            }`
          )
          handleQrScanned(result.text)
          return
        }
        // No text — pick a message based on where it failed.
        switch (result.reason) {
          case 'no-qr-in-image':
            setScanError(
              "Server tried 7 preprocessing passes and couldn't find a QR. The print contrast may be too low; try a tighter frame or use Manual entry."
            )
            toast.error('ZBar found no QR — print may be too low-contrast')
            break
          case 'server-error':
            setScanError(
              `Server decode failed (HTTP ${result.serverStatus}${
                result.serverError ? `: ${result.serverError}` : ''
              }). Try again — first request after deploy can cold-start.`
            )
            toast.error(`Server error ${result.serverStatus}`)
            break
          case 'image-load-failed':
            setScanError('Could not read the photo file. Try taking it again.')
            toast.error('Image load failed')
            break
          default:
            setScanError('Could not decode the photo. Try again.')
            toast.error('Photo decode failed')
        }
      } catch (err) {
        console.error('[scan-dialog] decode threw', err)
        setScanError('Could not decode the photo. Try again.')
        toast.error('Photo decode failed')
      } finally {
        setDecodingPhoto(false)
        // Restart the live scanner after a failed photo so the user can
        // try again without re-tapping Camera mode.
        if (!decoded && cameraSupported) startScanning()
      }
    },
    [handleQrScanned, stopCamera, cameraSupported, startScanning]
  )

  // Handle manual ID submission
  const handleManualSubmit = useCallback(() => {
    const id = manualId.trim()
    if (!id) return

    const deviceId = extractDeviceId(id)
    if (!deviceId) {
      setScanError('Invalid label ID. Use a 9-digit label ID (e.g. 002011395) or TIP-001 / HL-001234.')
      return
    }

    setManualId('')
    lookupLabel(deviceId)
  }, [manualId, lookupLabel])

  // Fetch available labels for browse mode. Scoped to this dispatch's order
  // (or org fallback) so the picker only surfaces labels the buyer paid for,
  // not unrelated warehouse stock.
  const fetchAvailableLabels = useCallback(async () => {
    setLoadingBrowse(true)
    try {
      const res = await fetch(
        `/api/v1/labels/lookup/available?shipmentId=${encodeURIComponent(shipmentId)}`
      )
      if (res.ok) {
        const data = await res.json()
        setAvailableLabels(data.labels)
      }
    } catch {
      // Silently fail — user can retry by switching modes
    } finally {
      setLoadingBrowse(false)
    }
  }, [shipmentId])

  // Auto-start camera when dialog opens in camera mode
  useEffect(() => {
    if (open && mode === 'camera' && cameraSupported && !scanning) {
      startScanning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Unmount safety: dialog-close cleanup runs in handleOpenChange, but if the
  // parent route unmounts while the dialog is still open, the camera stream
  // would otherwise keep running. Stop it on unmount unconditionally.
  useEffect(() => {
    return () => {
      controllerRef.current?.stop()
      controllerRef.current = null
    }
  }, [])

  // Auto-fetch when the dialog opens in browse mode, or when the user toggles
  // back to browse. Don't depend on availableLabels.length / loadingBrowse —
  // when the API returns an empty list (legitimate empty state), those deps
  // re-fire this effect after every fetch and spin forever.
  useEffect(() => {
    if (open && mode === 'browse') {
      fetchAvailableLabels()
    }
  }, [open, mode, fetchAvailableLabels])

  // Confirm ICCID and add label to scanned list
  const handleConfirmIccid = useCallback(() => {
    if (!pendingLabel || !iccidValue.trim()) return

    setScannedLabels((prev) => [
      ...prev,
      {
        labelId: pendingLabel.id,
        deviceId: pendingLabel.deviceId,
        displayId: pendingLabel.displayId,
        iccid: iccidValue.trim(),
      },
    ])
    setPendingLabel(null)
    setIccidValue('')
    setStep('scan')
    setScanError(null)

    // Auto-start camera for next scan if in camera mode
    if (mode === 'camera' && cameraSupported) {
      setTimeout(() => startScanning(), 200)
    }
  }, [pendingLabel, iccidValue, mode, cameraSupported, startScanning])

  // Remove a scanned label
  const handleRemoveLabel = useCallback((labelId: string) => {
    setScannedLabels((prev) => prev.filter((sl) => sl.labelId !== labelId))
  }, [])

  // Submit all scanned labels
  const handleSubmit = useCallback(async () => {
    if (scannedLabels.length === 0) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/v1/dispatch/${shipmentId}/verify-labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scannedLabels: scannedLabels.map(({ labelId, iccid }) => ({ labelId, iccid })),
        }),
      })

      if (res.ok) {
        toast.success('Dispatch marked as in transit')
        onOpenChange(false)
        resetDialog()
        onConfirmed()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to verify labels')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [scannedLabels, shipmentId, onOpenChange, onConfirmed, resetDialog])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen)
      if (!isOpen) {
        resetDialog()
      }
    },
    [onOpenChange, resetDialog]
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan & Link Labels</DialogTitle>
          <DialogDescription>
            Scan each physical label&apos;s QR code and enter its ICCID (SIM card ID) to link it
            to {shipmentName ? `"${shipmentName}"` : 'this dispatch'}.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground">
            {scannedLabels.length} label{scannedLabels.length !== 1 ? 's' : ''} scanned
            {labelCount ? ` of ${labelCount} expected` : ''}
          </span>
        </div>

        {/* Step: Scan QR */}
        {step === 'scan' && (
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button
                variant={mode === 'browse' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setMode('browse')
                  stopCamera()
                  setScanError(null)
                }}
              >
                <List className="h-3.5 w-3.5" />
                Browse
              </Button>
              {cameraSupported && (
                <Button
                  variant={mode === 'camera' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    setMode('camera')
                    setScanError(null)
                    startScanning()
                  }}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Camera
                </Button>
              )}
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setMode('manual')
                  stopCamera()
                  setScanError(null)
                }}
              >
                <Keyboard className="h-3.5 w-3.5" />
                Manual
              </Button>
            </div>

            {/* Camera view */}
            {mode === 'camera' && (
              <>
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
                  <video
                    ref={videoRef}
                    className="absolute inset-0 h-full w-full object-cover"
                    playsInline
                    muted
                  />
                  {scanning && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-56 w-56 rounded-lg border-2 border-white/70 sm:h-64 sm:w-64">
                        <div className="h-full w-full animate-pulse rounded-lg border-2 border-primary/60" />
                      </div>
                    </div>
                  )}
                  {!scanning && !scanError && !decodingPhoto && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-white/50" />
                      <p className="mt-2 text-sm text-white/50">Starting camera...</p>
                    </div>
                  )}
                  {(lookingUp || decodingPhoto) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                      {decodingPhoto && (
                        <p className="mt-2 text-sm text-white/80">Reading photo...</p>
                      )}
                    </div>
                  )}
                  {scanning && torchSupported && !lookingUp && (
                    <Button
                      type="button"
                      size="sm"
                      variant={torchOn ? 'default' : 'secondary'}
                      onClick={toggleTorch}
                      className="absolute bottom-8 right-3 gap-1.5"
                    >
                      {torchOn ? <Flashlight className="h-3.5 w-3.5" /> : <FlashlightOff className="h-3.5 w-3.5" />}
                      {torchOn ? 'Flash on' : 'Flash'}
                    </Button>
                  )}
                  <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-white/70">
                    Point at the label&apos;s QR code
                  </p>
                </div>
                {/* Native-camera fallback for low-contrast prints. iOS opens
                    the system camera, which decodes the green-on-navy QR
                    that the live WebRTC stream can't. */}
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
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={decodingPhoto || lookingUp}
                  className="w-full gap-1.5"
                >
                  <ImageIcon className="h-3.5 w-3.5" />
                  Can&apos;t scan? Take a photo
                </Button>
              </>
            )}

            {/* Manual entry */}
            {mode === 'manual' && (
              <div className="space-y-2">
                <Label htmlFor="scan-manual-id">Label ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="scan-manual-id"
                    placeholder="002011395 or TIP-001"
                    value={manualId}
                    onChange={(e) => {
                      setManualId(e.target.value)
                      setScanError(null)
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    className="font-mono"
                    disabled={lookingUp}
                  />
                  <Button onClick={handleManualSubmit} disabled={!manualId.trim() || lookingUp}>
                    {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Find'}
                  </Button>
                </div>
              </div>
            )}

            {/* Browse available labels */}
            {mode === 'browse' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by ID..."
                    value={browseFilter}
                    onChange={(e) => setBrowseFilter(e.target.value)}
                    className="pl-9 font-mono"
                  />
                </div>
                <div className="max-h-[240px] overflow-y-auto rounded-lg border border-border">
                  {loadingBrowse ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : availableLabels.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-6 px-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No labels available for dispatch
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <a href="/admin/labels" target="_blank" rel="noopener noreferrer">
                          Manage inventory
                        </a>
                      </Button>
                      <a
                        href={`/api/v1/admin/dispatch/${encodeURIComponent(shipmentId)}/diagnose`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                      >
                        Why is this empty?
                      </a>
                    </div>
                  ) : (
                    availableLabels
                      .filter((l) => {
                        if (!browseFilter) return true
                        const q = browseFilter.toLowerCase()
                        return (
                          l.deviceId.toLowerCase().includes(q) ||
                          (l.displayId?.toLowerCase().includes(q) ?? false)
                        )
                      })
                      .filter((l) => !scannedLabels.some((sl) => sl.labelId === l.id))
                      .map((label) => (
                        <button
                          key={label.id}
                          type="button"
                          className="flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted/50 disabled:opacity-50"
                          onClick={() => lookupLabel(label.displayId || label.deviceId)}
                          disabled={lookingUp}
                        >
                          <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium text-foreground">
                                {label.displayId || label.deviceId}
                              </span>
                              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                                {label.status}
                              </span>
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              {label.displayId && <span>{label.deviceId}</span>}
                              {label.iccid && <span>ICCID: {label.iccid}</span>}
                              {label.batteryPct != null && <span>{label.batteryPct}%</span>}
                            </div>
                          </div>
                        </button>
                      ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Enter ICCID */}
        {step === 'iccid' && pendingLabel && (
          <div className="space-y-3 rounded-lg border-2 border-primary/40 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <ScanLine className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-mono text-sm font-medium text-foreground">
                {pendingLabel.displayId}
              </span>
              <span className="text-xs text-muted-foreground">found</span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="iccid-input" className="text-sm font-medium">
                Step 2 — Enter the SIM ICCID
              </Label>
              <p className="text-xs text-muted-foreground">
                The 19–20 digit number printed on the SIM tray inside this label.
              </p>
              <div className="flex gap-2">
                <Input
                  id="iccid-input"
                  ref={iccidInputRef}
                  placeholder="e.g. 89457300000038022292"
                  value={iccidValue}
                  onChange={(e) => setIccidValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmIccid()}
                  className="font-mono"
                />
                <Button onClick={handleConfirmIccid} disabled={!iccidValue.trim()}>
                  Add label
                </Button>
              </div>
              {pendingLabel.existingIccid && (
                <p className="text-xs text-muted-foreground">
                  Current ICCID: <span className="font-mono">{pendingLabel.existingIccid}</span>
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setPendingLabel(null)
                setIccidValue('')
                setStep('scan')
                setScanError(null)
                if (mode === 'camera' && cameraSupported) startScanning()
              }}
            >
              Cancel this label
            </Button>
          </div>
        )}

        {/* Error */}
        {scanError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{scanError}</span>
          </div>
        )}

        {/* Scanned labels list */}
        {scannedLabels.length > 0 && (
          <div className="max-h-[200px] space-y-2 overflow-y-auto">
            {scannedLabels.map((sl) => (
              <ScannedLabelRow
                key={sl.labelId}
                displayId={sl.displayId}
                iccid={sl.iccid}
                onRemove={() => handleRemoveLabel(sl.labelId)}
                disabled={isSubmitting}
              />
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || scannedLabels.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Ship ({scannedLabels.length} label{scannedLabels.length !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
