import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { auth } from '@clerk/nextjs/server'
import { generateLabelPdf, type LabelData } from '@/lib/label-pdf'

/**
 * GET /api/v1/shipments/[id]/label-pdf
 * Returns the single-label print-ready PDF for a shipment's attached label.
 * Matches the output of the admin batch generator (/admin/labels/generate)
 * so users get the exact image that will be placed on the physical sticker.
 *
 * Access: owner (org match) or admin.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const inline = req.nextUrl.searchParams.get('inline') === '1'

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shipment = await db.shipment.findUnique({
      where: { id },
      select: {
        orgId: true,
        userId: true,
        label: {
          select: { deviceId: true, displayId: true, counter: true },
        },
      },
    })

    if (!shipment || !shipment.label) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Access control: admin bypass, else org or personal ownership
    if (user.role !== 'admin') {
      const { orgId } = await auth()
      const allowed = shipment.orgId
        ? shipment.orgId === orgId
        : shipment.userId === user.id
      if (!allowed) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // The printed URL MUST be the spec's canonical bare form: tip.live/{displayId}
    // (see docs/DEVICE-LOCATION-SYSTEM.md — Display ID Format). The proxy
    // rewrite in src/proxy.ts only matches 9-digit IDs; any other URL form on
    // the sticker leaves the public viewer staring at a sign-in page.
    //
    // If a label reached the print step without a displayId, it was created
    // outside the spec-compliant path (e.g. by an old bulk script). Refuse
    // to print a broken sticker — surface the problem so the label can be
    // reprovisioned with an IMEI instead.
    if (!shipment.label.displayId) {
      return NextResponse.json(
        {
          error: 'This label has no displayId. Reprovision via Admin → Labels → Generate (IMEI required) before printing the sticker.',
          deviceId: shipment.label.deviceId,
        },
        { status: 409 }
      )
    }
    const labelData: LabelData = {
      deviceId: shipment.label.deviceId,
      displayId: shipment.label.displayId,
      url: `tip.live/${shipment.label.displayId}`,
    }

    const cwd = process.cwd()
    const templatePath = path.resolve(cwd, 'public/label/TIP-Label-noQR-10x15cm.pdf')
    const fontPath = path.resolve(cwd, 'public/fonts/SuisseIntl-SemiBold.otf')

    if (!fs.existsSync(templatePath) || !fs.existsSync(fontPath)) {
      return NextResponse.json(
        { error: 'Label template or font missing on server' },
        { status: 500 }
      )
    }

    const templateBytes = fs.readFileSync(templatePath)
    const fontBytes = fs.readFileSync(fontPath)

    const pdfBytes = await generateLabelPdf([labelData], templateBytes, fontBytes)

    const filename = `TIP-Label-${labelData.displayId || labelData.deviceId}.pdf`
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
    console.error('[shipment-label-pdf] error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
