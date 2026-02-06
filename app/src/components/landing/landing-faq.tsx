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
      'TIP is a disposable tracking label you stick on your cargo for door-to-door visibility. It sends real-time location data so you and your consignee can see where the shipment is on a map, get delivery notifications, and share a tracking link — no carrier API needed.',
  },
  {
    question: 'How does tracking work?',
    answer:
      'Each label has built-in cellular connectivity (eSIM). After you activate it (scan QR, attach to cargo, enter destination), it determines its position via cell tower triangulation and reports location at a configurable interval. You view the position and route history in the TIP dashboard or via a shareable link.',
  },
  {
    question: 'Which countries are supported?',
    answer:
      'Tracking works in 180+ countries where our connectivity partner has coverage. Labels work on land, sea, and air shipments. Check coverage for your routes when you sign up.',
  },
  {
    question: 'How long does the battery last?',
    answer:
      'Labels are designed for 60+ days of typical use. Battery life depends on how often you set location updates. After delivery, the label continues transmitting until the battery is depleted, then it can be disposed of as e-waste.',
  },
  {
    question: 'How do I attach the label to my cargo?',
    answer:
      'Peel the adhesive backing and stick the label to a clean, flat surface on your shipment. Avoid metal-only surfaces that can block signal. For high-value or fragile cargo, place it where it won’t be damaged in transit.',
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
    question: 'Do you offer bulk or enterprise pricing?',
    answer:
      'Yes. For logistics companies or regular shippers who need more than 10 labels at a time, contact us at support@tip.live for custom pricing. We also offer an API for integrating TIP into your existing workflow.',
  },
]

export function LandingFAQ() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {faqs.map((faq, i) => (
        <AccordionItem key={i} value={`faq-${i}`}>
          <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
