import {
  Body,
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

interface ResearchThankYouEmailProps {
  leadName: string
  giftCardNote?: string
  customMessage?: string
}

export function ResearchThankYouEmail({
  leadName,
  giftCardNote,
  customMessage,
}: ResearchThankYouEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for your time — your insights are incredibly valuable</Preview>
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
              <Text style={icon}>🙏</Text>
              <Heading style={bannerHeading}>Thank You!</Heading>
            </Section>

            {customMessage ? (
              <Text style={paragraph}>{customMessage}</Text>
            ) : (
              <>
                <Text style={paragraph}>
                  Hi {leadName}, thank you so much for taking the time to speak with us. Your insights
                  about cargo tracking and logistics are incredibly valuable and will directly shape
                  how we build TIP.
                </Text>

                <Text style={paragraph}>
                  We really appreciate your candid feedback — it helps us ensure we&apos;re solving real
                  problems for real people.
                </Text>
              </>
            )}

            {giftCardNote && (
              <Section style={detailsBox}>
                <Text style={detailLabel}>Your Gift Card</Text>
                <Text style={detailValue}>{giftCardNote}</Text>
              </Section>
            )}

            <Section style={detailsBox}>
              <Text style={detailLabel}>Know someone who might be interested?</Text>
              <Text style={detailValue}>
                If you know anyone else in logistics who might be open to a similar conversation,
                we&apos;d love an introduction. We offer the same £30 gift card as a thank you for
                their time.
              </Text>
            </Section>

            <Text style={noteText}>
              If you have any follow-up thoughts or questions, don&apos;t hesitate to reply to this
              email. We&apos;d love to stay in touch.
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
  backgroundColor: '#dcfce7',
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
  color: '#166534',
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

export default ResearchThankYouEmail
