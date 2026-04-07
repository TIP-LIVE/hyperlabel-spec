'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Printer } from 'lucide-react'

interface LabelPreviewProps {
  shipmentId: string
  deviceId: string
  displayId: string | null
}

/**
 * Renders a faithful on-screen preview of the physical TIP label sticker
 * and a button to download the exact print-ready PDF.
 *
 * Preview layout mirrors the constants in lib/label-pdf.ts so what users
 * see here matches what the factory prints.
 */
export function LabelPreview({ shipmentId, deviceId, displayId }: LabelPreviewProps) {
  const numberPart = deviceId.replace(/^[a-zA-Z]+/, '')
  const url = `tip.live/w/${numberPart}`
  const serial = displayId || deviceId

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(`https://${url}`, {
      errorCorrectionLevel: 'M',
      margin: 0,
      color: { dark: '#66FF00', light: '#00000000' },
      width: 512,
    })
      .then((d) => {
        if (!cancelled) setQrDataUrl(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

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
        {/* Sticker preview — 10x15 aspect ratio, black bg, #66FF00 ink */}
        <div
          className="relative w-full overflow-hidden rounded-xl bg-black shadow-inner"
          style={{ aspectRatio: '10 / 15' }}
          aria-label="Physical label preview"
        >
          {/* QR code — top-right area, ~19.5% of canvas, offset to match PDF coords */}
          <div
            className="absolute"
            style={{
              right: '6%',
              top: '4.1%',
              width: '19.5%',
              aspectRatio: '1 / 1',
            }}
          >
            {qrDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="" className="h-full w-full" />
            )}
          </div>

          {/* Text block — bottom-left, in #66FF00 */}
          <div
            className="absolute font-mono text-[11px] font-semibold leading-tight sm:text-xs"
            style={{
              left: '12.8%',
              bottom: '5.6%',
              color: '#66FF00',
            }}
          >
            <div>{url}</div>
            <div className="mt-1">{serial}</div>
          </div>
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
