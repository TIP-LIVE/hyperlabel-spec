import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchInTransitEmailProps {
  dispatchName: string
  receiverName: string
  destinationAddress: string
  dispatchUrl: string
}

export function DispatchInTransitEmail({
  dispatchName,
  receiverName,
  destinationAddress,
  dispatchUrl,
}: DispatchInTransitEmailProps) {
  return (
    <BaseLayout preview={`Your TIP labels for "${dispatchName}" are on their way`}>
      <Heading style={heading}>🚛 Your labels are on their way</Heading>
      <Text style={subheading}>
        We&apos;ve handed <strong>{dispatchName}</strong> to the courier. Your TIP labels are now
        heading to your receiver.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Receiver</Text>
        <Text style={detailValue}>{receiverName}</Text>
        <Text style={detailLabel}>Delivery Address</Text>
        <Text style={detailValue}>{destinationAddress}</Text>
      </Section>

      <Text style={paragraph}>
        Typical delivery is 3–5 business days. We&apos;ll email you again as soon as the labels are
        marked as delivered so you can coordinate activation.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dispatchUrl}>
          View Dispatch
        </Button>
      </Section>

      <Text style={footerNote}>
        This doesn&apos;t look right? Reply to this email and our team will sort it out.
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

export default DispatchInTransitEmail
