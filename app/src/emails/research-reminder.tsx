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

interface ResearchReminderEmailProps {
  leadName: string
  date: string
  duration: number
  meetingLink?: string
  customMessage?: string
}

export function ResearchReminderEmail({
  leadName,
  date,
  duration,
  meetingLink,
  customMessage,
}: ResearchReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reminder: Your interview with TIP is tomorrow</Preview>
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
            <Section style={banner}>
              <Text style={icon}>⏰</Text>
              <Heading style={bannerHeading}>Interview Reminder</Heading>
            </Section>

            {customMessage ? (
              <Text style={paragraph}>{customMessage}</Text>
            ) : (
              <Text style={paragraph}>
                Hi {leadName}, just a friendly reminder that your research interview with TIP is
                coming up tomorrow.
              </Text>
            )}

            <Section style={detailsBox}>
              <Text style={detailLabel}>Date & Time</Text>
              <Text style={detailValue}>{date}</Text>

              <Text style={detailLabel}>Duration</Text>
              <Text style={detailValue}>{duration} minutes</Text>

              {meetingLink && (
                <>
                  <Text style={detailLabel}>Meeting Link</Text>
                  <Text style={detailValue}>{meetingLink}</Text>
                </>
              )}
            </Section>

            {meetingLink && (
              <Section style={buttonContainer}>
                <Button style={button} href={meetingLink}>
                  Join Meeting
                </Button>
              </Section>
            )}

            <Text style={noteText}>
              Need to reschedule? No problem — just reply to this email and we&apos;ll find another
              time.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://tip.live" style={footerLink}>tip.live</Link> — Door-to-door cargo tracking
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

const banner = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const icon = {
  fontSize: '48px',
  margin: '0 0 12px',
}

const bannerHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0',
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

export default ResearchReminderEmail
