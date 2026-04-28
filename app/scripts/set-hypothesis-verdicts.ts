/**
 * Set verdicts on the 6 hypotheses based on the 8-interview signal set.
 * Idempotent — re-running just re-applies the same string.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env' })
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
// eslint-disable-next-line @typescript-eslint/no-require-imports
neonConfig.webSocketConstructor = require('ws')

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }),
})

const verdicts: Record<string, string> = {
  H1: 'PARTIALLY VALIDATED — financial pain is concrete and quantified for international forwarder/consignee operations (Dmytro: $3-4k/month loss/damage on $100k book; Andriy K: caught a driver lying about a customs delay with a single $80 tracker). Universal-pain framing is too strong: domestic parcel networks (Nova Poshta) and small-AOV e-commerce (Volodymyr U) do not feel it. ICP narrows to international air + multi-modal cargo where dwell costs are measured.',
  H2: 'VALIDATED FOR ICP — international cargo flows run multi-tool stacks today (EDI step status + separate tracker contract + carrier portal + WhatsApp), and the integration burden is real (Dmytro: separate per-country DHL contracts to isolate lost legs; Andriy K: large clients build their own Power BI dashboards from disparate sources). Invalidating signal from Nova Poshta scoped to domestic parcel scan-based tracking, which is a different category from the ICP.',
  H3: 'PARTIALLY VALIDATED — $20 lands at high-AOV / consolidated-cargo level (Andriy K: "значно дешевше" vs $80/$150 trackers; Anna\'s friend: "for big machinery 20 euro is peanuts"; Muhammed: "20 USD is a good price"). Fails for low-AOV per-parcel flows (Volodymyr U: $5 ceiling on $130 AOV; Masiuk: questions $20 vs typical parcel value). Pricing must segment: ~$20 list for ICP, ~$5 effective via consolidated-cargo or end-customer add-on for low-AOV.',
  H4: 'NEEDS MORE DATA — only one true forwarder (Andriy K, Nippon Express) gave a usable signal: yes, would activate on behalf of clients, especially with a return-credit incentive. The Nova Poshta intro (Masiuk) was a screening miss (BizDev, not operations). Dmytro flagged the activation-failure risk (label sits on shelf) which applies regardless of who activates. Verdict deferred until 2-3 more operational forwarder interviews.',
  H5: 'CONDITIONALLY VALIDATED — city/port/district granularity (500m–10km) is "good enough" for the cargo-tracking use case Dmytro and Muhammed use the product for. Inadequate for two adjacent use cases: (a) high-value parcel last-mile where customer wants 2m precision to physically locate (Masiuk), (b) intra-Europe air where the 2h cadence is slower than the flight itself (Masiuk). Stays as a conscious trade-off for the wedge segment; document the limitation clearly so we don\'t mis-target.',
  H6: 'VALIDATED — buyer is the cargo owner (importer/exporter / consignee) for the international cargo wedge. Anna, Iegor, Andriy K, Muhammed all confirmed directly. Dmytro confirmed forwarders are facilitators, not buyers. One adjacent finding: low-AOV e-commerce can flip the buyer to the END CUSTOMER via a checkout add-on (Volodymyr U: "за 5 баксів точно купляли"), which is a separate pricing motion not a refutation.',
}

async function main() {
  for (const [code, verdict] of Object.entries(verdicts)) {
    const r = await prisma.researchHypothesis.update({
      where: { code },
      data: { verdict },
    })
    console.log(`${r.code} ✓ verdict set (${verdict.length} chars)`)
  }
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
