import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const templates = [
  {
    type: 'outreach',
    subject: "TIP Research — We'd love to hear your perspective",
    body: `Hi {{name}},

I'm Denys from TIP — we're building a new way to track cargo shipments door-to-door using IoT labels. We're currently conducting research interviews to better understand the challenges people face with shipment visibility.

{{persona_context}}

What to expect:
A friendly 45–60 minute video call where we'll ask about your current experience with cargo tracking. No sales pitch — just genuine curiosity about your workflow.

Compensation:
As a thank you, we'll send you a £30 Amazon gift card after the interview.

Schedule a call: {{calendar_link}}

If you have any questions or would prefer a different time, just reply to this email. We're happy to work around your schedule.

—
tip.live — Door-to-door cargo tracking

You received this because we think your experience in logistics could help shape a better tracking solution. If you're not interested, simply ignore this email.`,
  },
  {
    type: 'scheduled',
    subject: 'Your interview with TIP is confirmed',
    body: `Hi {{name}}, your research interview with TIP has been confirmed. We're looking forward to hearing your perspective!

Date & Time: {{date}}
Duration: {{duration}} minutes
Meeting Link: {{meeting_link}}

What to Expect:
A relaxed conversation about your experience with cargo tracking and logistics. There are no right or wrong answers — we're genuinely curious about your workflow and the challenges you face.

Consent:
With your permission, we may take notes or record the session for internal use only. We'll ask for your consent at the start of the call.

Need to reschedule? Just reply to this email and we'll find another time that works.

—
tip.live — Door-to-door cargo tracking`,
  },
  {
    type: 'reminder',
    subject: 'Reminder: Your interview with TIP is tomorrow',
    body: `Hi {{name}}, just a friendly reminder that your research interview with TIP is coming up tomorrow.

Date & Time: {{date}}
Duration: {{duration}} minutes
Meeting Link: {{meeting_link}}

Need to reschedule? No problem — just reply to this email and we'll find another time.

—
tip.live — Door-to-door cargo tracking`,
  },
  {
    type: 'thank_you',
    subject: 'Thank you for your time — TIP Research',
    body: `Hi {{name}}, thank you so much for taking the time to speak with us. Your insights about cargo tracking and logistics are incredibly valuable and will directly shape how we build TIP.

We really appreciate your candid feedback — it helps us ensure we're solving real problems for real people.

Your Gift Card:
{{gift_card_note}}

Know someone who might be interested?
If you know anyone else in logistics who might be open to a similar conversation, we'd love an introduction. We offer the same £30 gift card as a thank you for their time.

If you have any follow-up thoughts or questions, don't hesitate to reply to this email. We'd love to stay in touch.

—
tip.live — Door-to-door cargo tracking`,
  },
  {
    type: 'referral',
    subject: "Know someone in logistics? We'd love an introduction",
    body: `Hi {{name}}, thank you again for the great conversation we had recently. Your insights have been incredibly helpful in shaping TIP.

We're looking to speak with more people in the logistics space — particularly those who deal with cargo tracking, freight forwarding, or receiving shipments. If anyone comes to mind, we'd be very grateful for an introduction.

What's in it for them?
A friendly 45–60 minute conversation about their experience with cargo tracking. No sales pitch — just genuine research. Plus a £30 Amazon gift card as a thank you.

How to refer:
Simply reply to this email with their name and email address, or forward this message to them directly. We'll take it from there.

Even one referral makes a huge difference. Thank you for helping us build something that truly serves the logistics industry.

—
tip.live — Door-to-door cargo tracking`,
  },
]

async function main() {
  console.log('Seeding research email templates...')

  for (const template of templates) {
    // Find existing template for this type with null persona
    const existing = await prisma.researchEmailTemplate.findFirst({
      where: { type: template.type, persona: null },
    })

    if (existing) {
      const updated = await prisma.researchEmailTemplate.update({
        where: { id: existing.id },
        data: {
          subject: template.subject,
          body: template.body,
          status: 'IN_REVIEW',
        },
      })
      console.log(`  ↻ ${template.type} — updated ${updated.id} → IN_REVIEW`)
    } else {
      const created = await prisma.researchEmailTemplate.create({
        data: {
          type: template.type,
          persona: null,
          subject: template.subject,
          body: template.body,
          status: 'IN_REVIEW',
        },
      })
      console.log(`  ✓ ${template.type} — created ${created.id} → IN_REVIEW`)
    }
  }

  console.log('\nDone! All 5 email templates are now IN_REVIEW.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
