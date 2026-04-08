import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { generateLabelPdf, type LabelData } from '@/lib/label-pdf'

/**
 * GET /api/v1/admin/labels/[id]/pdf
 * Returns the single-label print-ready PDF for a provisioned label.
 *
 * Looks up the label by DB `id` (not deviceId/displayId) so reprints are
 * idempotent — calling this endpoint multiple times never consumes a new
 * counter.
 *
 * Pass `?inline=1` to preview in the browser instead of triggering a download.
 * Admin-only.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const inline = req.nextUrl.searchParams.get('inline') === '1'

    const label = await db.label.findUnique({
      where: { id },
      select: { id: true, deviceId: true, displayId: true },
    })

    if (!label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    if (!label.displayId) {
      return NextResponse.json(
        { error: 'Label has no displayId (not provisioned with IMEI)' },
        { status: 422 }
      )
    }

    // The printed sticker uses tip.live/w/{displayId} — /w/[code] already
    // handles 9-digit pass-through (see app/src/app/w/[code]/page.tsx).
    const labelData: LabelData = {
      deviceId: label.deviceId,
      displayId: label.displayId,
      url: `tip.live/w/${label.displayId}`,
    }

    const cwd = process.cwd()
    const templatePath = path.resolve(cwd, 'public/label/TIP-Label-noQR-10x15cm.pdf')
    const fontPath = path.resolve(cwd, 'public/fonts/SuisseIntl-SemiBold.otf')

    if (!fs.existsSync(templatePath) || !fs.existsSync(fontPath)) {
      console.error('[admin-label-pdf] template or font missing', {
        cwd,
        templatePath,
        fontPath,
      })
      return NextResponse.json(
        { error: 'Label template or font missing on server' },
        { status: 500 }
      )
    }

    const templateBytes = fs.readFileSync(templatePath)
    const fontBytes = fs.readFileSync(fontPath)

    const pdfBytes = await generateLabelPdf([labelData], templateBytes, fontBytes)

    const filename = `TIP-Label-${label.displayId}.pdf`
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
        'Content-Length': String(pdfBytes.length),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    return handleApiError(error, 'generating label PDF')
  }
}
