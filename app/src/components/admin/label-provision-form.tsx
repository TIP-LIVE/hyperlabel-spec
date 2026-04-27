'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseModemQr, ModemQrParseError, type ModemQrFields } from '@/lib/qr-parser'
import { ModemQrScanner } from '@/components/admin/modem-qr-scanner'

type Stage = 'IDLE' | 'PARSED' | 'CREATING' | 'SUCCESS'

interface ProvisionedLabelResponse {
  label: {
    id: string
    displayId: string
    deviceId: string
    imei: string
    counter: number
    firmwareVersion: string | null
    createdAt: string
  }
  pdfUrl: string
}

interface DuplicateLabelError {
  error: string
  code: 'DUPLICATE_IMEI'
  existingLabel: {
    id: string
    displayId: string | null
    imei: string | null
  } | null
}

const EXAMPLE_QR =
  'P/N:S2-109ZV-Z33R0;SN:MP06254801C7951;IMEI:864756085431395;SW:A011B27A7672M7'

export function LabelProvisionForm() {
  const [stage, setStage] = useState<Stage>('IDLE')
  const [qrText, setQrText] = useState('')
  const [parsed, setParsed] = useState<ModemQrFields | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [createdLabel, setCreatedLabel] = useState<
    ProvisionedLabelResponse['label'] | null
  >(null)
  const [duplicateExisting, setDuplicateExisting] = useState<
    DuplicateLabelError['existingLabel'] | null
  >(null)
  const [showRawQr, setShowRawQr] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const scanNextButtonRef = useRef<HTMLButtonElement>(null)

  // Focus management: always autofocus the primary element for the current stage.
  useEffect(() => {
    if (stage === 'IDLE') {
      inputRef.current?.focus()
    } else if (stage === 'PARSED') {
      confirmButtonRef.current?.focus()
    } else if (stage === 'SUCCESS') {
      scanNextButtonRef.current?.focus()
    }
  }, [stage])

  const reset = useCallback(() => {
    setStage('IDLE')
    setQrText('')
    setParsed(null)
    setParseError(null)
    setApiError(null)
    setCreatedLabel(null)
    setDuplicateExisting(null)
    setShowRawQr(false)
  }, [])

  // Try to parse the current text; return null on failure.
  const tryParse = useCallback((text: string): ModemQrFields | null => {
    try {
      return parseModemQr(text)
    } catch (err) {
      if (err instanceof ModemQrParseError) {
        setParseError(err.message)
      } else {
        setParseError('Failed to parse QR text')
      }
      return null
    }
  }, [])

  const handleParse = useCallback(() => {
    setApiError(null)
    setParseError(null)
    const result = tryParse(qrText)
    if (result) {
      setParsed(result)
      setStage('PARSED')
    }
  }, [qrText, tryParse])

  const handleScanned = useCallback(
    (rawText: string) => {
      setApiError(null)
      setParseError(null)
      setQrText(rawText)
      const result = tryParse(rawText)
      if (result) {
        setParsed(result)
        setStage('PARSED')
      }
    },
    [tryParse]
  )

  // Auto-parse as soon as the input contains a complete-looking QR
  // (IMEI: followed by 15 digits). On iOS Safari the first tap on the Read QR
  // button can be eaten by the soft keyboard dismiss, so the explicit click
  // doesn't always register. Auto-parsing on paste/type sidesteps that.
  useEffect(() => {
    if (stage !== 'IDLE') return
    if (!qrText.trim()) return
    if (!/\bIMEI\s*:\s*\d{15}\b/i.test(qrText)) return
    const result = tryParse(qrText)
    if (result) {
      setParsed(result)
      setStage('PARSED')
    }
  }, [qrText, stage, tryParse])

  const downloadPdf = useCallback(
    async (pdfUrl: string, displayId: string) => {
      try {
        const pdfRes = await fetch(pdfUrl)
        if (!pdfRes.ok) {
          throw new Error(`PDF download failed: ${pdfRes.status}`)
        }
        const blob = await pdfRes.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `TIP-Label-${displayId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        return true
      } catch (err) {
        console.error('[label-provision] PDF download failed', err)
        toast.error('Could not download the label PDF. Click retry.')
        return false
      }
    },
    []
  )

  const handleConfirm = useCallback(async () => {
    if (!parsed) return
    setStage('CREATING')
    setApiError(null)
    setDuplicateExisting(null)

    try {
      const res = await fetch('/api/v1/admin/labels/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrText }),
      })

      if (res.status === 409) {
        const body = (await res.json()) as DuplicateLabelError
        setDuplicateExisting(body.existingLabel)
        setApiError(
          body.existingLabel?.displayId
            ? `This modem is already registered as label ${body.existingLabel.displayId}.`
            : 'This modem is already registered.'
        )
        setStage('PARSED')
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }))
        setApiError(body.error || `Request failed: ${res.status}`)
        setStage('PARSED')
        return
      }

      const body = (await res.json()) as ProvisionedLabelResponse
      setCreatedLabel(body.label)
      setStage('SUCCESS')

      // Auto-trigger the PDF download. If the browser suppresses it, the
      // user can retry from the success view.
      await downloadPdf(body.pdfUrl, body.label.displayId)
    } catch (err) {
      console.error('[label-provision] POST failed', err)
      setApiError('Network error. Please try again.')
      setStage('PARSED')
    }
  }, [parsed, qrText, downloadPdf])

  const handleDownloadExisting = useCallback(async () => {
    if (!duplicateExisting?.id || !duplicateExisting?.displayId) return
    await downloadPdf(
      `/api/v1/admin/labels/${duplicateExisting.id}/pdf`,
      duplicateExisting.displayId
    )
  }, [duplicateExisting, downloadPdf])

  const handleRetryDownload = useCallback(async () => {
    if (!createdLabel) return
    await downloadPdf(
      `/api/v1/admin/labels/${createdLabel.id}/pdf`,
      createdLabel.displayId
    )
  }, [createdLabel, downloadPdf])

  // Global Enter handler for SUCCESS stage.
  useEffect(() => {
    if (stage !== 'SUCCESS') return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [stage, reset])

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Provision label from modem QR</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stage === 'IDLE' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="qrText">Modem QR text</Label>
              <Input
                ref={inputRef}
                id="qrText"
                value={qrText}
                onChange={(e) => {
                  setQrText(e.target.value)
                  setParseError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleParse()
                  }
                }}
                placeholder={EXAMPLE_QR}
                className="font-mono text-xs"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                Paste the full QR text, scan it with a USB QR reader (which types
                into the field), or click the camera button to use your webcam.
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Read QR</span> extracts
                the IMEI and firmware from the text so you can review them before
                the label is created.
              </p>
            </div>

            {parseError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                onClick={handleParse}
                disabled={!qrText.trim()}
                className="flex-1"
              >
                Read QR
              </Button>
              <ModemQrScanner onScanned={handleScanned} />
            </div>
          </>
        )}

        {stage === 'PARSED' && parsed && (
          <>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <ParsedRow label="IMEI" value={parsed.imei} />
              <ParsedRow label="Firmware" value={parsed.firmwareVersion ?? '—'} />
            </div>

            <details
              className="text-xs text-muted-foreground"
              open={showRawQr}
              onToggle={(e) => setShowRawQr(e.currentTarget.open)}
            >
              <summary className="cursor-pointer select-none">Show raw QR text</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all rounded-md bg-muted p-2 font-mono">
                {qrText}
              </pre>
            </details>

            {apiError && (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{apiError}</span>
                </div>
                {duplicateExisting?.id && duplicateExisting?.displayId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadExisting}
                    className="self-start gap-2"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download existing PDF
                  </Button>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                className="flex-1"
              >
                Confirm &amp; create label
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {stage === 'CREATING' && (
          <div
            className="flex flex-col items-center justify-center py-10"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Creating label...</p>
          </div>
        )}

        {stage === 'SUCCESS' && createdLabel && (
          <>
            <div className="flex flex-col items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center dark:border-green-400/30 dark:bg-green-400/5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-1 font-mono text-3xl font-bold tracking-wider">
                {createdLabel.displayId}
              </p>
              <p className="text-xs text-muted-foreground">
                tip.live/w/{createdLabel.displayId}
              </p>
              <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                Label created — PDF downloaded
              </p>
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <ParsedRow label="IMEI" value={createdLabel.imei} small />
              <ParsedRow
                label="Firmware"
                value={createdLabel.firmwareVersion ?? '—'}
                small
              />
              <ParsedRow
                label="Counter"
                value={String(createdLabel.counter)}
                small
                muted
              />
            </div>

            <div className="flex gap-2">
              <Button
                ref={scanNextButtonRef}
                onClick={reset}
                className="flex-1 gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Scan next label
              </Button>
              <Button
                variant="outline"
                onClick={handleRetryDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function ParsedRow({
  label,
  value,
  muted = false,
  small = false,
}: {
  label: string
  value: string
  muted?: boolean
  small?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span
        className={
          small
            ? 'text-[10px] uppercase tracking-wide text-muted-foreground'
            : 'text-xs uppercase tracking-wide text-muted-foreground'
        }
      >
        {label}
      </span>
      <span
        className={`truncate font-mono ${small ? 'text-xs' : 'text-sm'} ${
          muted ? 'text-muted-foreground' : 'text-foreground'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
