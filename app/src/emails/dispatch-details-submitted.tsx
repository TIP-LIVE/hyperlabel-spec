import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchDetailsSubmittedEmailProps {
  dispatchName: string
  receiverName: string
  receiverEmail: string
  destinationAddress: string
  dispatchUrl: string
  cancelUrl: string
}

export function DispatchDetailsSubmittedEmail({
  dispatchName,
  receiverName,
  receiverEmail,
  destinationAddress,
  dispatchUrl,
  cancelUrl,
}: DispatchDetailsSubmittedEmailProps) {
  return (
    <BaseLayout preview="Receiver has submitted their delivery details">
      <Heading style={heading}>✅ Receiver details submitted</Heading>
      <Text style={subheading}>
        {receiverName} has completed the delivery form for <strong>{dispatchName}</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Receiver</Text>
        <Text style={detailValue}>
          {receiverName} &lt;{receiverEmail}&gt;
        </Text>
        <Text style={detailLabel}>Delivery Address</Text>
        <Text style={detailValue}>{destinationAddress}</Text>
      </Section>

      <Text style={paragraph}>
        Your dispatch will ship within 1 business day. You can view the dispatch and track it
        door-to-door from your dashboard.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dispatchUrl}>
          View Dispatch
        </Button>
      </Section>

      <Text style={footerNote}>
        This doesn&apos;t look right?{' '}
        <Link href={cancelUrl} style={link}>
          Cancel this dispatch
        </Link>{' '}
        immediately. We&apos;ll halt the shipment and restore the labels to your account.
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
const link = {
  color: '#00CC00',
  textDecoration: 'underline',
}

export default DispatchDetailsSubmittedEmail
