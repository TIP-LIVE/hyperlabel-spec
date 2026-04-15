/**
 * Generate TIP label PDFs for PRINT PREVIEW ONLY — does NOT write to the DB.
 *
 * This script exists for layout review and factory mock-ups. Real labels go
 * through /admin/labels/generate which calls provisionLabel() and records an
 * IMEI — the only path that produces a spec-compliant NNNNNYYYY displayId
 * (see docs/DEVICE-LOCATION-SYSTEM.md#auto-registration-of-new-labels).
 *
 * Previously this script wrote bare {deviceId, status: INVENTORY} rows with no
 * IMEI and no displayId. That created a class of labels whose sticker URL
 * (tip.live/w{timestamp}) would never work because the proxy rewrite only
 * matches 9-digit spec IDs. DB writes have been removed to prevent a repeat.
 *
 * Usage:
 *   npx tsx scripts/generate-labels.ts --count 10 --output ./preview.pdf
 */
import * as fs from 'fs'
import * as path from 'path'
import { generateLabelPdf, type LabelData } from '../src/lib/label-pdf'

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2)
  const parsed: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      parsed[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : 'true'
      if (parsed[key] !== 'true') i++
    }
  }
  return parsed
}

async function main() {
  const args = parseArgs()
  const count = parseInt(args.count || '0')
  const prefix = args.prefix || 'w'
  const startNumber = args.start ? parseInt(args.start) : Math.floor(Date.now() / 100) * 10 + 1
  const outputPath = args.output || `./output/labels-${Date.now()}.pdf`

  if (!count || count < 1) {
    console.error('Usage: npx tsx scripts/generate-labels.ts --count <number> [--start <number>] [--output <path>]')
    console.error('Note: this is a PREVIEW-ONLY tool. It never writes to the DB.')
    console.error('To create real labels, use /admin/labels/generate (requires IMEI).')
    process.exit(1)
  }

  if (count > 10000) {
    console.error('Error: Maximum 10,000 labels per batch')
    process.exit(1)
  }

  // Generate label IDs (preview only — these are NOT persisted)
  const labels: LabelData[] = []
  for (let i = 0; i < count; i++) {
    const num = startNumber + i
    const deviceId = `${prefix}${num}`
    labels.push({
      deviceId,
      url: `tip.live/w/${num}`,
    })
  }

  console.log(`Generating ${count} label preview PDFs (no DB writes)...`)
  console.log(`  ID range: ${labels[0].deviceId} → ${labels[count - 1].deviceId}`)
  console.log(`  QR URLs:  https://${labels[0].url} → https://${labels[count - 1].url}`)
  console.log()

  // Generate PDF
  console.log('Generating PDF...')
  const templateBytes = fs.readFileSync(path.resolve(__dirname, '../public/label/TIP-Label-noQR-10x15cm.pdf'))
  const fontBytes = fs.readFileSync(path.resolve(__dirname, '../../Fonts/SuisseIntl-Bold.otf'))
  const pdfBytes = await generateLabelPdf(labels, templateBytes, fontBytes)

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath)
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  fs.writeFileSync(outputPath, pdfBytes)
  const sizeMb = (pdfBytes.length / 1024 / 1024).toFixed(1)
  console.log(`  Saved: ${outputPath} (${sizeMb} MB, ${count} pages)`)
  console.log()
  console.log('Done!')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
