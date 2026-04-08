import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { handleApiError } from '@/lib/api-utils'
import { parseModemQr, ModemQrParseError } from '@/lib/qr-parser'
import { provisionLabel, ProvisionLabelError } from '@/lib/label-id'

const provisionSchema = z.object({
  qrText: z.string().min(1, 'qrText is required'),
})

/**
 * POST /api/v1/admin/labels/provision
 *
 * Create one label from a scanned modem QR code. The QR text must contain an
 * IMEI field (e.g. "P/N:...;SN:...;IMEI:864756085431395;SW:A011B27A7672M7").
 *
 * Response: { label, pdfUrl } — client should fetch pdfUrl separately to
 * download the printable sticker.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const body = await req.json()
    const validated = provisionSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'VALIDATION_FAILED',
          details: validated.error.flatten(),
        },
        { status: 400 }
      )
    }

    // Parse the QR text into structured fields. Throws ModemQrParseError on
    // format issues — we map those to 400 responses.
    let parsed
    try {
      parsed = parseModemQr(validated.data.qrText)
    } catch (err) {
      if (err instanceof ModemQrParseError) {
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 400 }
        )
      }
      throw err
    }

    // Useful for debugging — P/N and SN are not persisted but we log them.
    console.info('[provision-label] parsed QR', {
      imei: parsed.imei,
      firmware: parsed.firmwareVersion,
      partNumber: parsed.partNumber,
      serialNumber: parsed.serialNumber,
    })

    // Create the Label row (counter + displayId in one transaction).
    try {
      const label = await provisionLabel({
        imei: parsed.imei,
        firmwareVersion: parsed.firmwareVersion,
      })

      return NextResponse.json(
        {
          label: {
            id: label.id,
            displayId: label.displayId,
            deviceId: label.deviceId,
            imei: label.imei,
            counter: label.counter,
            firmwareVersion: label.firmwareVersion,
            createdAt: label.createdAt,
          },
          pdfUrl: `/api/v1/admin/labels/${label.id}/pdf`,
        },
        { status: 201 }
      )
    } catch (err) {
      if (err instanceof ProvisionLabelError) {
        if (err.code === 'DUPLICATE_IMEI') {
          return NextResponse.json(
            {
              error: err.message,
              code: err.code,
              existingLabel: err.existingLabel ?? null,
            },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: err.message, code: err.code },
          { status: 400 }
        )
      }
      throw err
    }
  } catch (error) {
    return handleApiError(error, 'provisioning label')
  }
}
