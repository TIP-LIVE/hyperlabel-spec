'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'What is TIP?',
    answer:
      'TIP is a disposable tracking label that gives you door-to-door visibility on any cargo. We hold the labels in our warehouse and dispatch them wherever you tell us — your office, a forwarder, or directly to a supplier. The receiver pulls the activation tab, sticks the label on the cargo, and you follow the shipment in real time on a live map (with a shareable link for your consignee).',
  },
  {
    question: 'Where do my labels arrive?',
    answer:
      'Wherever you tell us. After purchase, you create a Dispatch from your dashboard with the destination address. We physically ship the labels to that address — your office, a forwarder, a warehouse, a supplier — anywhere in the world. If you don\u2019t know the receiver\u2019s details yet, you can share a private link and let them fill in their own address.',
  },
  {
    question: 'Can I send labels directly to a supplier or shipper?',
    answer:
      'Yes — that\u2019s the most common flow. You buy the labels, we dispatch them to whoever is going to handle the cargo, and they activate the labels on the spot. You can also share a private link with the receiver so they confirm their own delivery address before we ship.',
  },
  {
    question: 'How long until my labels arrive?',
    answer:
      'Typically 3–5 business days from when the dispatch destination is confirmed. International destinations may take a bit longer depending on customs.',
  },
  {
    question: 'Do I need to be the one who attaches the label?',
    answer:
      'No. Whoever receives the labels can pull the activation tab and stick them on the cargo — they don\u2019t need a TIP account or any technical setup. Most of our customers dispatch labels straight to their shipper or supplier.',
  },
  {
    question: 'How does tracking work?',
    answer:
      'Each label has built-in cellular connectivity (softSIM). Once the receiver pulls the activation tab and attaches the label, it determines its position via cell tower triangulation and reports location every 2 hours by default. Our system automatically detects whether your cargo is on a flight, ocean vessel, or road transport, showing the precise route on the map. You view the position and route history in the TIP dashboard or via a shareable link.',
  },
  {
    question: 'Which countries are supported?',
    answer:
      'Tracking works reliably in 180+ countries with stable cellular connectivity. Labels report every 2 hours by default and work on land, sea, and air shipments. Check coverage for your routes when you sign up.',
  },
  {
    question: 'How long does the battery last?',
    answer:
      'Labels are designed for 60+ days of typical use. Battery life depends on how often you set location updates. After delivery, the label continues transmitting until the battery is depleted, then it can be disposed of as e-waste.',
  },
  {
    question: 'How is the label attached to the cargo?',
    answer:
      'After your receiver pulls the activation tab, they peel the adhesive backing and stick the label to a clean, flat surface on the shipment. Avoid metal-only surfaces that can block the signal. For high-value or fragile cargo, place the label where it won\u2019t be damaged in transit.',
  },
  {
    question: 'Can I share tracking with my consignee?',
    answer:
      'Yes. You can generate a public tracking link from the dashboard and send it to your consignee. They can view the map and status without creating an account.',
  },
  {
    question: 'What if the label is defective?',
    answer:
      'We replace or refund any defective label — no questions asked. Unused (sealed) labels can be returned within 30 days for a full refund. Once a label is activated it is single-use, so activated labels are not refundable.',
  },
  {
    question: 'Can I track multiple shipments at once?',
    answer:
      'Yes. Each label tracks one shipment, but your dashboard shows all active shipments on a single map. You can buy as many labels as you need and manage them all from one account.',
  },
  {
    question: 'Does TIP use AI?',
    answer:
      'Yes. TIP detects transport modes — flights, ocean vessels, trucks — and reconstructs the precise route your cargo takes. You see not just location dots, but the actual journey. We\u2019re continuously adding more AI-powered intelligence, including predictive alerts and smarter route analysis.',
  },
  {
    question: 'Do you offer bulk or enterprise pricing?',
    answer:
      'Yes. For logistics companies or regular shippers who need more than 10 labels at a time, contact us at support@tip.live for custom pricing. We also offer an API for integrating TIP into your existing workflow.',
  },
]

export function LandingFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, i) => (
        <AccordionItem key={i} value={`faq-${i}`} className="border-border">
          <AccordionTrigger className="text-left text-foreground">{faq.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
