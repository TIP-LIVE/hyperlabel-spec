import { PDFDocument, rgb } from 'pdf-lib'
import * as fontkit from '@pdf-lib/fontkit'
import QRCode from 'qrcode'

export interface LabelData {
  deviceId: string // e.g. "w17246198247"
  url: string // e.g. "tip.live/w/17246198247"
}

// Layout constants (page is 1000x1500 points)
// Positions match the reference PDF (TIP-Label-withQR-asreference-10x15cm.pdf)
const LAYOUT = {
  urlText: { x: 128, y: 145, fontSize: 28 },
  serialText: { x: 128, y: 82, fontSize: 28 },
  qrCode: { x: 725, y: 62, size: 195 },
  textColor: rgb(0, 1, 0), // #00FF00 neon green
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

    // Generate QR code as PNG
    const qrPng = await QRCode.toBuffer(`https://${label.url}`, {
      type: 'png',
      width: 400,
      margin: 0,
      color: {
        dark: '#00FF00',
        light: '#00000000',
      },
      errorCorrectionLevel: 'M',
    })

    // Embed QR code image
    const qrImage = await outputDoc.embedPng(qrPng)
    const { x, y, size } = LAYOUT.qrCode
    copiedPage.drawImage(qrImage, { x, y, width: size, height: size })

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
