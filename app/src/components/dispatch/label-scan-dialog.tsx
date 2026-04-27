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
  Keyboard,
  Loader2,
  AlertCircle,
  Package,
  ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { extractDeviceId } from '@/lib/extract-device-id'
import { ScannedLabelRow } from './scanned-label-row'
import { decodeQrFromImage } from '@/lib/qr-scan'
import { PhotoCaptureButton } from '@/components/shared/photo-capture-button'

interface ScannedLabel {
  labelId: string
  deviceId: string
  displayId: string
  iccid: string | null
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

export function LabelScanDialog({
  shipmentId,
  shipmentName,
  labelCount,
  open,
  onOpenChange,
  onConfirmed,
}: LabelScanDialogProps) {
  const [scannedLabels, setScannedLabels] = useState<ScannedLabel[]>([])
  const [step, setStep] = useState<ScanStep>('scan')
  const [mode, setMode] = useState<'photo' | 'manual'>('manual')
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
  // Two-step confirm before allowing ICCID-less dispatch. ICCID is the
  // expected path (see CLAUDE.md rule #4 — Onomondo routes by ICCID), and
  // skipping it should feel deliberate.
  const [confirmingBypass, setConfirmingBypass] = useState(false)

  // Available warehouse labels (rendered as a picker under the Manual input)
  const [availableLabels, setAvailableLabels] = useState<AvailableLabel[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)

  // Photo decode state. Live WebRTC scanning was removed because the
  // still-photo path is more reliable on iOS for low-contrast prints.
  const [decodingPhoto, setDecodingPhoto] = useState(false)

  const iccidInputRef = useRef<HTMLInputElement>(null)

  const resetDialog = useCallback(() => {
    setScannedLabels([])
    setStep('scan')
    setMode('manual')
    setManualId('')
    setScanError(null)
    setPendingLabel(null)
    setIccidValue('')
    setConfirmingBypass(false)
    setIsSubmitting(false)
    setLookingUp(false)
    setAvailableLabels([])
    setLoadingAvailable(false)
  }, [])

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

        // Auto-focus ICCID input after render
        setTimeout(() => iccidInputRef.current?.focus(), 100)
      } catch {
        setScanError('Failed to look up label. Please try again.')
      } finally {
        setLookingUp(false)
      }
    },
    [scannedLabels, shipmentId]
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

  // Snapshot decode. Mobile gets the still via native camera, desktop via
  // the in-app webcam preview. Live continuous decoding was removed because
  // the still-photo path is more reliable for low-contrast PCB prints.
  const handlePhoto = useCallback(
    async (file: Blob) => {
      if (file.size === 0) {
        toast.error('Photo was empty (0 bytes). Try again.')
        return
      }
      setScanError(null)
      setDecodingPhoto(true)
      try {
        const result = await decodeQrFromImage(file)
        if (result.text) {
          handleQrScanned(result.text)
          return
        }
        switch (result.reason) {
          case 'no-qr-in-image':
            setScanError(
              "Couldn't find a QR in the photo. Try a tighter frame, better lighting, or use Manual entry."
            )
            break
          case 'server-error':
            setScanError(
              `Server decode failed (HTTP ${result.serverStatus}${
                result.serverError ? `: ${result.serverError}` : ''
              }). Try again — first request after deploy can cold-start.`
            )
            break
          case 'image-load-failed':
            setScanError('Could not read the photo file. Try taking it again.')
            break
          default:
            setScanError('Could not decode the photo. Try again.')
        }
      } catch {
        setScanError('Could not decode the photo. Try again.')
      } finally {
        setDecodingPhoto(false)
      }
    },
    [handleQrScanned]
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

  // Fetch warehouse labels (real hardware, free of active dispatch/cargo)
  // for the Manual picker.
  const fetchAvailableLabels = useCallback(async () => {
    setLoadingAvailable(true)
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
      setLoadingAvailable(false)
    }
  }, [shipmentId])

  // Auto-fetch the warehouse picker when the dialog opens in Manual mode, or
  // when the user toggles back to Manual. Don't depend on availableLabels /
  // loadingAvailable — when the API returns an empty list (legitimate empty
  // state), those deps re-fire this effect after every fetch and spin forever.
  useEffect(() => {
    if (open && mode === 'manual') {
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
    setConfirmingBypass(false)
    setStep('scan')
    setScanError(null)
  }, [pendingLabel, iccidValue])

  // Ship without ICCID — the label will pair on the first Onomondo signal
  // via IMEI fallback in device-report.ts. Useful when shipping bare modems
  // before the SIM has been inserted/paired. Reached only after the user
  // confirms the inline warning.
  const handleShipWithoutIccid = useCallback(() => {
    if (!pendingLabel) return

    setScannedLabels((prev) => [
      ...prev,
      {
        labelId: pendingLabel.id,
        deviceId: pendingLabel.deviceId,
        displayId: pendingLabel.displayId,
        iccid: null,
      },
    ])
    setPendingLabel(null)
    setIccidValue('')
    setConfirmingBypass(false)
    setStep('scan')
    setScanError(null)
  }, [pendingLabel])

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
          scannedLabels: scannedLabels.map(({ labelId, iccid }) => ({
            labelId,
            iccid: iccid ?? null,
          })),
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
                variant={mode === 'photo' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setMode('photo')
                  setScanError(null)
                }}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Photo
              </Button>
              <Button
                variant={mode === 'manual' ? 'default' : 'outline'}
                size="sm"
                className="flex-1 gap-1.5"
                onClick={() => {
                  setMode('manual')
                  setScanError(null)
                }}
              >
                <Keyboard className="h-3.5 w-3.5" />
                Manual
              </Button>
            </div>

            {/* Photo capture: native camera on mobile, webcam dialog on desktop */}
            {mode === 'photo' && (
              <div className="space-y-2">
                <PhotoCaptureButton
                  onPhoto={handlePhoto}
                  label={decodingPhoto ? 'Reading photo…' : 'Take photo of QR'}
                  disabled={decodingPhoto || lookingUp}
                  className="w-full gap-1.5"
                />
                <p className="text-xs text-muted-foreground">
                  Hold the camera 10–20 cm from the label so the QR fills the frame.
                </p>
              </div>
            )}

            {/* Manual entry — search + warehouse picker */}
            {mode === 'manual' && (() => {
              const trimmed = manualId.trim().toLowerCase()
              const filtered = availableLabels
                .filter((l) => !scannedLabels.some((sl) => sl.labelId === l.id))
                .filter((l) => {
                  if (!trimmed) return true
                  return (
                    l.deviceId.toLowerCase().includes(trimmed) ||
                    (l.displayId?.toLowerCase().includes(trimmed) ?? false)
                  )
                })
              const visible = filtered.slice(0, 10)
              const hiddenCount = filtered.length - visible.length

              return (
                <div className="space-y-2">
                  <Label htmlFor="scan-manual-id">Label ID</Label>
                  <div className="flex gap-2">
                    <Input
                      id="scan-manual-id"
                      placeholder="Search or type 002011395 / TIP-001"
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
                      {lookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                    </Button>
                  </div>

                  <div className="rounded-lg border border-border">
                    {loadingAvailable ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableLabels.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                        <p className="text-sm text-muted-foreground">
                          No warehouse labels available
                        </p>
                        <Button asChild variant="outline" size="sm">
                          <a href="/admin/labels" target="_blank" rel="noopener noreferrer">
                            Manage inventory
                          </a>
                        </Button>
                      </div>
                    ) : visible.length === 0 ? (
                      <div className="py-5 px-4 text-center text-sm text-muted-foreground">
                        No labels match &ldquo;{manualId.trim()}&rdquo;. Press Add to look it up anyway.
                      </div>
                    ) : (
                      <>
                        <div className="border-b border-border bg-muted/30 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Warehouse · {filtered.length} available
                        </div>
                        {visible.map((label) => (
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
                                {label.iccid && <span>ICCID: {label.iccid}</span>}
                                {label.batteryPct != null && <span>{label.batteryPct}%</span>}
                              </div>
                            </div>
                          </button>
                        ))}
                        {hiddenCount > 0 && (
                          <div className="border-t border-border px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                            +{hiddenCount} more — refine search to narrow
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
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

            {confirmingBypass ? (
              <div className="space-y-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Ship{' '}
                      <span className="font-mono">{pendingLabel.displayId}</span>{' '}
                      without an ICCID?
                    </p>
                    <p className="text-xs text-muted-foreground">
                      The label will pair to a SIM only when the device first
                      connects to the network. Enter the ICCID now if you have it
                      — that&apos;s the reliable path.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfirmingBypass(false)
                      setTimeout(() => iccidInputRef.current?.focus(), 50)
                    }}
                  >
                    Back to ICCID
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShipWithoutIccid}
                  >
                    Ship without ICCID
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => {
                      setPendingLabel(null)
                      setIccidValue('')
                      setConfirmingBypass(false)
                      setStep('scan')
                      setScanError(null)
                    }}
                  >
                    Cancel this label
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirmingBypass(true)}
                    className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:text-muted-foreground hover:underline"
                  >
                    I don&apos;t have the ICCID
                  </button>
                </div>
              </>
            )}
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
