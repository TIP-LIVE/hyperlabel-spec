import * as opentype from 'opentype.js'
import {
  asPDFNumber,
  PDFDocument,
  PDFOperator,
  PDFOperatorNames,
  pushGraphicsState,
  popGraphicsState,
  rgb,
} from 'pdf-lib'
import QRCode from 'qrcode'

export interface LabelData {
  deviceId: string // legacy internal handle, e.g. "w17246198247"
  displayId?: string | null // NNNNNYYYY user-facing ID (preferred on sticker)
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

const n = asPDFNumber

/**
 * Draw text as outlined vector paths using raw PDF operators.
 * Uses opentype.js to extract glyph outlines, then emits PDF path operators
 * directly. This bypasses drawSvgPath which has color issues on copied pages
 * with custom color spaces (the template uses a non-DeviceRGB color space).
 *
 * Result: factory can print without needing the font file ("convert all
 * fonts to outlines").
 */
function drawTextAsOutlines(
  page: ReturnType<PDFDocument['getPages']>[0],
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: opentype.Font
) {
  const path = font.getPath(text, 0, 0, fontSize)
  if (path.commands.length === 0) return

  const ops: PDFOperator[] = [
    pushGraphicsState(),
    // Translate to position and flip Y (opentype Y-down → PDF Y-up)
    PDFOperator.of(PDFOperatorNames.ConcatTransformationMatrix, [n(1), n(0), n(0), n(-1), n(x), n(y)]),
    // Set fill color to #66FF00 using DeviceRGB operator
    PDFOperator.of(PDFOperatorNames.NonStrokingColorRgb, [n(0x66 / 255), n(1), n(0)]),
  ]

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        ops.push(PDFOperator.of(PDFOperatorNames.MoveTo, [n(cmd.x), n(cmd.y)]))
        break
      case 'L':
        ops.push(PDFOperator.of(PDFOperatorNames.LineTo, [n(cmd.x), n(cmd.y)]))
        break
      case 'C':
        ops.push(
          PDFOperator.of(PDFOperatorNames.AppendBezierCurve, [
            n(cmd.x1),
            n(cmd.y1),
            n(cmd.x2),
            n(cmd.y2),
            n(cmd.x),
            n(cmd.y),
          ])
        )
        break
      case 'Q':
        ops.push(
          PDFOperator.of(PDFOperatorNames.CurveToReplicateInitialPoint, [n(cmd.x1), n(cmd.y1), n(cmd.x), n(cmd.y)])
        )
        break
      case 'Z':
        ops.push(PDFOperator.of(PDFOperatorNames.ClosePath, []))
        break
    }
  }

  ops.push(PDFOperator.of(PDFOperatorNames.FillNonZero, [])) // fill path
  ops.push(popGraphicsState())

  page.pushOperators(...ops)
}

export async function generateLabelPdf(
  labels: LabelData[],
  templateBytes: Uint8Array | Buffer,
  fontBytes: Uint8Array | Buffer
): Promise<Uint8Array> {
  const templateDoc = await PDFDocument.load(templateBytes)
  const outputDoc = await PDFDocument.create()

  // Parse font with opentype.js for path extraction (no font embedding)
  const font = opentype.parse(
    fontBytes instanceof Buffer
      ? fontBytes.buffer.slice(
          fontBytes.byteOffset,
          fontBytes.byteOffset + fontBytes.byteLength
        )
      : fontBytes.buffer
  )

  for (const label of labels) {
    const [copiedPage] = await outputDoc.copyPages(templateDoc, [0])
    outputDoc.addPage(copiedPage)

    // Draw QR code as native PDF rectangles (exact #66FF00 color)
    const { x, y, size } = LAYOUT.qrCode
    drawQrCode(copiedPage, `https://${label.url}`, x, y, size)

    // Draw URL text as outlines
    drawTextAsOutlines(
      copiedPage,
      label.url,
      LAYOUT.urlText.x,
      LAYOUT.urlText.y,
      LAYOUT.urlText.fontSize,
      font
    )

    // Draw serial number as outlines (prefer new displayId, fall back to deviceId)
    drawTextAsOutlines(
      copiedPage,
      label.displayId || label.deviceId,
      LAYOUT.serialText.x,
      LAYOUT.serialText.y,
      LAYOUT.serialText.fontSize,
      font
    )
  }

  return outputDoc.save()
}
