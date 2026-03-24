import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { generateLabelPdf, type LabelData } from '@/lib/label-pdf'
import { z } from 'zod'
import * as fs from 'fs'
import * as path from 'path'

const generateSchema = z.object({
  count: z.number().int().min(1).max(500),
  prefix: z.string().default('w'),
  startNumber: z.number().int().positive().optional(),
  createDbRecords: z.boolean().default(true),
})

/**
 * POST /api/v1/admin/labels/generate
 * Generate label PDFs with unique QR codes (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = generateSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { count, prefix, createDbRecords } = validated.data
    const startNumber =
      validated.data.startNumber || Math.floor(Date.now() / 100) * 10 + 1

    // Generate label data
    const labels: LabelData[] = []
    for (let i = 0; i < count; i++) {
      const num = startNumber + i
      const deviceId = `${prefix}${num}`
      labels.push({
        deviceId,
        url: `tip.live/w/${num}`,
      })
    }

    // Create DB records if requested
    if (createDbRecords) {
      // Check for collisions
      const existing = await db.label.findMany({
        where: { deviceId: { in: labels.map((l) => l.deviceId) } },
        select: { deviceId: true },
      })

      if (existing.length > 0) {
        return NextResponse.json(
          {
            error: `${existing.length} device IDs already exist`,
            existingIds: existing.map((e) => e.deviceId),
          },
          { status: 409 }
        )
      }

      await db.label.createMany({
        data: labels.map((l) => ({
          deviceId: l.deviceId,
          status: 'INVENTORY' as const,
        })),
      })
    }

    // Load template and font
    const cwd = process.cwd()
    const templatePath = path.resolve(cwd, 'public/label/TIP-Label-noQR-10x15cm.pdf')
    const fontPath = path.resolve(cwd, 'public/fonts/SuisseIntl-Bold.otf')

    console.log('[generate-labels] cwd:', cwd)
    console.log('[generate-labels] templatePath:', templatePath, 'exists:', fs.existsSync(templatePath))
    console.log('[generate-labels] fontPath:', fontPath, 'exists:', fs.existsSync(fontPath))

    if (!fs.existsSync(templatePath)) {
      // On Vercel, try .next/server/app path or list directories for debugging
      const publicDir = path.resolve(cwd, 'public')
      const publicExists = fs.existsSync(publicDir)
      let publicContents: string[] = []
      if (publicExists) {
        try { publicContents = fs.readdirSync(publicDir) } catch {}
      }
      console.log('[generate-labels] public/ exists:', publicExists, 'contents:', publicContents)

      // Try alternative paths on Vercel
      const altPaths = [
        path.resolve(cwd, '.next/server/app/public/label/TIP-Label-noQR-10x15cm.pdf'),
        path.resolve('/var/task/public/label/TIP-Label-noQR-10x15cm.pdf'),
        path.resolve('/var/task/.next/server/app/public/label/TIP-Label-noQR-10x15cm.pdf'),
      ]
      for (const alt of altPaths) {
        console.log('[generate-labels] alt path:', alt, 'exists:', fs.existsSync(alt))
      }

      return NextResponse.json(
        { error: 'Template file not found on server', debug: { cwd, templatePath, publicExists, publicContents } },
        { status: 500 }
      )
    }

    if (!fs.existsSync(fontPath)) {
      return NextResponse.json(
        { error: 'Font file not found on server', debug: { cwd, fontPath } },
        { status: 500 }
      )
    }

    const templateBytes = fs.readFileSync(templatePath)
    const fontBytes = fs.readFileSync(fontPath)

    // Generate PDF
    const pdfBytes = await generateLabelPdf(labels, templateBytes, fontBytes)

    // Return PDF as binary download
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="TIP-Labels-${labels[0].deviceId}-to-${labels[count - 1].deviceId}.pdf"`,
        'Content-Length': String(pdfBytes.length),
      },
    })
  } catch (error) {
    console.error('[generate-labels] error:', error)
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    return NextResponse.json(
      { error: message, stack },
      { status: 500 }
    )
  }
}
