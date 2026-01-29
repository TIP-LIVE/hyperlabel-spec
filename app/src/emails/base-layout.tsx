import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseLayoutProps {
  preview: string
  children: React.ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://hyperlabel.io/logo.png"
              width="40"
              height="40"
              alt="HyperLabel"
              style={logo}
            />
            <Text style={logoText}>HyperLabel</Text>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You received this email because you have an active shipment with HyperLabel.
            </Text>
            <Text style={footerText}>
              <Link href="https://hyperlabel.io/settings" style={link}>
                Manage notification preferences
              </Link>
              {' • '}
              <Link href="https://hyperlabel.io" style={link}>
                Visit HyperLabel
              </Link>
            </Text>
            <Text style={footerText}>© 2026 HyperLabel. All rights reserved.</Text>
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

const link = {
  color: '#556cd6',
  textDecoration: 'underline',
}
