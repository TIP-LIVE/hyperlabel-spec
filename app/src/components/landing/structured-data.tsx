import { getLabelPacks, toDisplayPacks } from '@/lib/pricing'

function fmt(dollars: number): string {
  return Number.isInteger(dollars) ? dollars.toFixed(0) : dollars.toFixed(2)
}

const faqItemsStatic = [
  {
    question: 'What is a TIP tracking label?',
    answer:
      'TIP is a disposable cellular tracking label that you attach to your cargo. It uses LTE Cat-1 connectivity and an embedded softSIM to transmit location data from 180+ countries — no scanners, no apps, no infrastructure required.',
  },
  {
    question: 'How does TIP work?',
    answer:
      'Scan the QR code on the label with your phone camera to activate it, peel off the backing, and stick it to your cargo. The label starts transmitting location data within seconds. Track your shipment via the TIP dashboard or share a public tracking link with anyone.',
  },
  {
    question: 'How much does a TIP label cost?',
    // Answer is overridden at render time with live pricing from the DB.
    answer: '',
  },
  {
    question: 'Do I need to return the label after delivery?',
    answer:
      'No. TIP labels are designed as single-use devices. There is no return shipping, no cleaning, no recharging, and no fleet management. Ship it, track it, done.',
  },
  {
    question: 'Which countries does TIP cover?',
    answer:
      'TIP labels work in 180+ countries via embedded softSIM technology. They connect to local cellular networks automatically — on land, at sea, and in the air.',
  },
  {
    question: 'Can I share tracking with my customers?',
    answer:
      'Yes. Every shipment generates a public tracking link that anyone can open in a browser — no app downloads, no account creation. Share it via email, messaging apps, or any channel.',
  },
]

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TIP',
  url: 'https://tip.live',
  logo: 'https://tip.live/images/TIP-Logo.svg',
  description:
    'Door-to-door cargo tracking labels with real-time visibility in 180+ countries.',
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'support@tip.live',
    contactType: 'customer service',
  },
}

function buildProductSchema(lowPerLabel: number, highPerLabel: number, offerCount: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'TIP Tracking Label',
    description:
      'Disposable cellular tracking label for cargo shipments. LTE Cat-1 connectivity, 60+ day battery, 180+ country coverage. One-time purchase, no subscriptions.',
    brand: { '@type': 'Brand', name: 'TIP' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: fmt(lowPerLabel),
      highPrice: fmt(highPerLabel),
      offerCount: String(offerCount),
      availability: 'https://schema.org/InStock',
    },
    image: 'https://tip.live/images/tip-label-3d.webp',
  }
}

function buildFaqSchema(lowPerLabel: number) {
  const fromPrice = `$${fmt(lowPerLabel)}`
  const items = faqItemsStatic.map((item) =>
    item.question === 'How much does a TIP label cost?'
      ? {
          ...item,
          answer: `TIP labels start from ${fromPrice} per label. The price includes 60+ days of cellular connectivity, full platform access, shareable tracking links, and email notifications. No monthly fees, no data plans, no hidden costs.`,
        }
      : item
  )
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TIP',
  url: 'https://tip.live',
  description:
    'Door-to-door cargo tracking labels. Real-time visibility in 180+ countries.',
}

export async function StructuredData() {
  const packs = toDisplayPacks(await getLabelPacks().catch(() => []))
  const perLabelValues = packs.map((p) => p.perLabel)
  const lowPerLabel = perLabelValues.length > 0 ? Math.min(...perLabelValues) : 20
  const highPerLabel = perLabelValues.length > 0 ? Math.max(...perLabelValues) : 30

  const productSchema = buildProductSchema(lowPerLabel, highPerLabel, packs.length || 3)
  const faqSchema = buildFaqSchema(lowPerLabel)

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}
