import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchDetailsRequestedEmailProps {
  senderName: string
  completeUrl: string
  note?: string | null
}

export function DispatchDetailsRequestedEmail({
  senderName,
  completeUrl,
  note,
}: DispatchDetailsRequestedEmailProps) {
  return (
    <BaseLayout preview={`${senderName} needs your delivery address to ship TIP tracking labels`}>
      <Heading style={heading}>📦 Your TIP labels are ready to ship</Heading>
      <Text style={subheading}>
        {senderName} is sending you TIP tracking labels and needs your delivery details.
      </Text>

      {note && (
        <Section style={noteBox}>
          <Text style={noteLabel}>Message from {senderName}</Text>
          <Text style={noteValue}>{note}</Text>
        </Section>
      )}

      <Text style={paragraph}>
        Click the button below to enter your shipping address. No account required. The labels
        will ship as soon as you complete the form.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={completeUrl}>
          Complete Delivery Details
        </Button>
      </Section>

      <Text style={footerNote}>
        This link expires in 14 days. You received this because {senderName} shared it with you via
        TIP — door-to-door cargo tracking.
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}
const subheading = {
  fontSize: '16px',
  color: '#64748b',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}
const noteBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}
const noteLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}
const noteValue = {
  fontSize: '15px',
  color: '#0f172a',
  margin: '0',
  whiteSpace: 'pre-wrap' as const,
}
const buttonContainer = { margin: '32px 0' }
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
const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}

export default DispatchDetailsRequestedEmail
