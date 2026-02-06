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
