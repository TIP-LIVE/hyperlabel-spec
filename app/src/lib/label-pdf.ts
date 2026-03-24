import { PDFDocument, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

import * as fontkitModule from '@pdf-lib/fontkit'

// Handle CJS/ESM interop — Vercel's bundler may wrap the module with .default
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fontkit = (fontkitModule as any).default || fontkitModule

export interface LabelData {
  deviceId: string // e.g. "w17246198247"
  url: string // e.g. "tip.live/w/17246198247"
}

// Layout constants (page is 1000x1500 points)
// Positions match the reference PDF (TIP-Label-withQR-asreference-10x15cm.pdf)
const QR_COLOR = rgb(0x66 / 255, 1, 0) // #66FF00

const LAYOUT = {
  urlText: { x: 128, y: 147, fontSize: 28 },
  serialText: { x: 128, y: 84, fontSize: 28 },
  qrCode: { x: 745, y: 62, size: 195 },
  textColor: QR_COLOR,
}

/**
 * Draw QR code using native PDF rectangles for exact color control.
 * The qrcode library's PNG color option produces incorrect colors (#00FF00 instead of #66FF00).
 */
function drawQrCode(
  page: ReturnType<PDFDocument['getPages']>[0],
  url: string,
  x: number,
  y: number,
  size: number
) {
  // Generate QR matrix data
  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const modules = qr.modules
  const moduleCount = modules.size
  const moduleSize = size / moduleCount
  // Overlap each cell by 0.5pt to eliminate visible seams between rectangles
  const overlap = 0.5

  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (modules.get(row, col)) {
        // PDF y-axis is bottom-up, QR row 0 is top
        page.drawRectangle({
          x: x + col * moduleSize,
          y: y + (moduleCount - 1 - row) * moduleSize - overlap,
          width: moduleSize + overlap,
          height: moduleSize + overlap,
          color: QR_COLOR,
        })
      }
    }
  }
}

export async function generateLabelPdf(
  labels: LabelData[],
  templateBytes: Uint8Array | Buffer,
  fontBytes: Uint8Array | Buffer
): Promise<Uint8Array> {
  const templateDoc = await PDFDocument.load(templateBytes)

  const outputDoc = await PDFDocument.create()
  outputDoc.registerFontkit(fontkit)

  const font = await outputDoc.embedFont(fontBytes)

  for (const label of labels) {
    const [copiedPage] = await outputDoc.copyPages(templateDoc, [0])
    outputDoc.addPage(copiedPage)

    // Draw QR code as native PDF rectangles (exact #66FF00 color)
    const { x, y, size } = LAYOUT.qrCode
    drawQrCode(copiedPage, `https://${label.url}`, x, y, size)

    // Draw URL text
    copiedPage.drawText(label.url, {
      x: LAYOUT.urlText.x,
      y: LAYOUT.urlText.y,
      size: LAYOUT.urlText.fontSize,
      font,
      color: LAYOUT.textColor,
    })

    // Draw serial number
    copiedPage.drawText(label.deviceId, {
      x: LAYOUT.serialText.x,
      y: LAYOUT.serialText.y,
      size: LAYOUT.serialText.fontSize,
      font,
      color: LAYOUT.textColor,
    })
  }

  return outputDoc.save()
}
