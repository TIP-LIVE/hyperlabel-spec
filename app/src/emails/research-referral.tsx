import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface ResearchReferralEmailProps {
  leadName: string
  referralLink?: string
}

export function ResearchReferralEmail({
  leadName,
  referralLink,
}: ResearchReferralEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Know someone in logistics? We'd love an introduction</Preview>
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
              <Text style={icon}>🤝</Text>
              <Heading style={bannerHeading}>Help Us Learn More</Heading>
            </Section>

            <Text style={paragraph}>
              Hi {leadName}, thank you again for the great conversation we had recently. Your
              insights have been incredibly helpful in shaping TIP.
            </Text>

            <Text style={paragraph}>
              We're looking to speak with more people in the logistics space — particularly those
              who deal with cargo tracking, freight forwarding, or receiving shipments. If anyone
              comes to mind, we'd be very grateful for an introduction.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLabel}>What's in it for them?</Text>
              <Text style={detailValue}>
                A friendly 45–60 minute conversation about their experience with cargo tracking.
                No sales pitch — just genuine research. Plus a £30 Amazon gift card as a thank you.
              </Text>

              <Text style={detailLabel}>How to refer</Text>
              <Text style={detailValue}>
                Simply reply to this email with their name and email address, or forward this
                message to them directly. We'll take it from there.
              </Text>
            </Section>

            {referralLink && (
              <Section style={buttonContainer}>
                <Button style={button} href={referralLink}>
                  Share Referral Link
                </Button>
              </Section>
            )}

            <Text style={noteText}>
              Even one referral makes a huge difference. Thank you for helping us build something
              that truly serves the logistics industry.
            </Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              TIP — Door-to-door cargo tracking
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
  backgroundColor: '#ede9fe',
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
  color: '#5b21b6',
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

export default ResearchReferralEmail
