'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

interface LabelPreviewProps {
  shipmentId: string
  deviceId: string
  displayId: string | null
}

/**
 * Shows a WYSIWYG preview of the physical TIP label sticker by rendering
 * the real print-ready PDF inline in an <object>, plus a download button.
 * The same endpoint serves both: ?inline=1 for preview, no query for download.
 */
export function LabelPreview({ shipmentId, deviceId, displayId }: LabelPreviewProps) {
  const serial = displayId || deviceId
  const previewUrl = `/api/v1/shipments/${shipmentId}/label-pdf?inline=1#view=FitH&toolbar=0&navpanes=0`

  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Fetch PDF as a blob so we get proper auth (cookies) and can embed via blob URL.
  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/shipments/${shipmentId}/label-pdf?inline=1`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        if (cancelled) return
        createdUrl = URL.createObjectURL(blob)
        setPdfBlobUrl(createdUrl)
      } catch (e) {
        console.error('[label-preview] load failed', e)
        if (!cancelled) setLoadError(true)
      }
    })()
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [shipmentId])

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`/api/v1/shipments/${shipmentId}/label-pdf`)
      if (!res.ok) throw new Error('Failed to generate PDF')
      const blob = await res.blob()
      const href = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = href
      a.download = `TIP-Label-${serial}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    } catch (e) {
      console.error('[label-preview] download failed', e)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Physical Label
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Inline PDF preview — exact rendering of the print-ready file */}
        <div
          className="relative w-full overflow-hidden rounded-xl border bg-muted"
          style={{ aspectRatio: '10 / 15' }}
        >
          {pdfBlobUrl && !loadError && (
            <object
              data={`${pdfBlobUrl}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
              type="application/pdf"
              className="h-full w-full"
              aria-label="Physical label preview"
            >
              {/* Fallback for browsers that refuse PDF embed: show an iframe */}
              <iframe
                src={previewUrl}
                className="h-full w-full border-0"
                title="Physical label preview"
              />
            </object>
          )}
          {!pdfBlobUrl && !loadError && (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Loading preview…
            </div>
          )}
          {loadError && (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-muted-foreground">
              Preview unavailable — use Download below.
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          This is the exact image printed on the sticker attached to your cargo.
        </p>

        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full rounded-full"
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Preparing PDF…' : 'Download print-ready PDF'}
        </Button>
      </CardContent>
    </Card>
  )
}
