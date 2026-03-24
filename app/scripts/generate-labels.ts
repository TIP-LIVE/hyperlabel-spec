/**
 * Generate TIP label PDFs with unique QR codes and serial numbers.
 *
 * Usage:
 *   npx tsx scripts/generate-labels.ts --count 100
 *   npx tsx scripts/generate-labels.ts --count 50 --start 17246198001
 *   npx tsx scripts/generate-labels.ts --count 10 --dry-run
 *   npx tsx scripts/generate-labels.ts --count 5 --output ./my-labels.pdf
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
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
  const dryRun = args['dry-run'] === 'true'
  const skipDb = args['no-db'] === 'true' || dryRun
  const outputPath = args.output || `./output/labels-${Date.now()}.pdf`

  if (!count || count < 1) {
    console.error('Usage: npx tsx scripts/generate-labels.ts --count <number> [--start <number>] [--dry-run] [--no-db] [--output <path>]')
    process.exit(1)
  }

  if (count > 10000) {
    console.error('Error: Maximum 10,000 labels per batch')
    process.exit(1)
  }

  // Generate label IDs
  const labels: LabelData[] = []
  for (let i = 0; i < count; i++) {
    const num = startNumber + i
    const deviceId = `${prefix}${num}`
    labels.push({
      deviceId,
      url: `tip.live/w/${num}`,
    })
  }

  console.log(`Generating ${count} labels...`)
  console.log(`  ID range: ${labels[0].deviceId} → ${labels[count - 1].deviceId}`)
  console.log(`  QR URLs:  https://${labels[0].url} → https://${labels[count - 1].url}`)
  console.log(`  DB write: ${skipDb ? 'SKIPPED' : 'YES'}`)
  console.log()

  // Create DB records if not dry run
  if (!skipDb) {
    if (!process.env.DATABASE_URL) {
      console.error('Error: DATABASE_URL is required for DB writes. Use --dry-run or --no-db to skip.')
      process.exit(1)
    }

    const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
    const prisma = new PrismaClient({ adapter })

    try {
      // Check for ID collisions
      const existing = await prisma.label.findMany({
        where: { deviceId: { in: labels.map((l) => l.deviceId) } },
        select: { deviceId: true },
      })

      if (existing.length > 0) {
        console.error(`Error: ${existing.length} device IDs already exist in DB:`)
        existing.slice(0, 5).forEach((e) => console.error(`  - ${e.deviceId}`))
        if (existing.length > 5) console.error(`  ... and ${existing.length - 5} more`)
        process.exit(1)
      }

      // Bulk create labels in INVENTORY status
      console.log('Creating DB records...')
      const result = await prisma.label.createMany({
        data: labels.map((l) => ({
          deviceId: l.deviceId,
          status: 'INVENTORY' as const,
        })),
      })
      console.log(`  Created ${result.count} label records (status: INVENTORY)`)
    } finally {
      await prisma.$disconnect()
    }
  }

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
