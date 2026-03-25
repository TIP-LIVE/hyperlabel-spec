import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ResearchOutreachEmailProps {
  leadName: string
  persona: string
  calendarLink: string
  customMessage?: string
}

export function ResearchOutreachEmail({
  leadName,
  persona,
  calendarLink,
  customMessage,
}: ResearchOutreachEmailProps) {
  const personaContext: Record<string, string> = {
    CONSIGNEE:
      'As someone who receives cargo shipments, your perspective on tracking and visibility is incredibly valuable.',
    FORWARDER:
      'As a freight forwarder, your insights on shipment coordination and tracking would be incredibly valuable.',
    SHIPPER:
      'As someone involved in shipping goods, your perspective on cargo tracking and logistics would be incredibly valuable.',
  }

  return (
    <Html>
      <Head />
      <Preview>TIP Research — We&apos;d love to hear your perspective on cargo tracking</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src="https://tip.live/logo.png"
              width="40"
              height="40"
              alt="TIP"
              style={logo}
            />
            <Text style={logoText}>TIP</Text>
          </Section>

          <Section style={content}>
            <Heading style={heading}>Hi {leadName},</Heading>

            {customMessage ? (
              <Text style={paragraph}>{customMessage}</Text>
            ) : (
              <>
                <Text style={paragraph}>
                  I&apos;m Denys from TIP — we&apos;re building a new way to track cargo shipments
                  door-to-door using IoT labels. We&apos;re currently conducting research interviews
                  to better understand the challenges people face with shipment visibility.
                </Text>

                <Text style={paragraph}>
                  {personaContext[persona] || personaContext.CONSIGNEE}
                </Text>
              </>
            )}

            <Section style={detailsBox}>
              <Text style={detailLabel}>What to expect</Text>
              <Text style={detailValue}>
                A friendly 45–60 minute video call where we&apos;ll ask about your current experience
                with cargo tracking. No sales pitch — just genuine curiosity about your workflow.
              </Text>

              <Text style={detailLabel}>Compensation</Text>
              <Text style={detailValue}>
                As a thank you, we&apos;ll send you a £30 Amazon gift card after the interview.
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={button} href={calendarLink}>
                Schedule a Call
              </Button>
            </Section>

            <Text style={noteText}>
              If you have any questions or would prefer a different time, just reply to this email.
              We&apos;re happy to work around your schedule.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://tip.live" style={footerLink}>tip.live</Link> — Door-to-door cargo tracking
            </Text>
            <Text style={footerText}>
              You received this because we think your experience in logistics could help shape a
              better tracking solution. If you&apos;re not interested, simply ignore this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const header = {
  padding: '24px 32px',
  display: 'flex',
  alignItems: 'center',
}

const logo = {
  display: 'inline-block',
  marginRight: '12px',
}

const logoText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  display: 'inline-block',
  margin: '0',
}

const content = {
  padding: '0 32px',
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 16px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}

const detailsBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const detailValue = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0 0 16px',
}

const buttonContainer = {
  margin: '32px 0',
}

const button = {
  backgroundColor: '#00CC00',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
}

const noteText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '24px 0 0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 0',
}

const footer = {
  padding: '0 32px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '8px 0',
}

const footerLink = {
  color: '#8898aa',
  textDecoration: 'underline',
}

export default ResearchOutreachEmail
