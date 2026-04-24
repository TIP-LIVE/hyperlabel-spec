import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchConsigneeInTransitEmailProps {
  shipmentName: string
  destinationAddress?: string | null
  trackingUrl: string
  unsubscribeUrl: string
}

export function DispatchConsigneeInTransitEmail({
  shipmentName,
  destinationAddress,
  trackingUrl,
  unsubscribeUrl,
}: DispatchConsigneeInTransitEmailProps) {
  return (
    <BaseLayout preview={`A package of TIP labels is on its way to you`}>
      <Heading style={heading}>📦 A package of TIP labels is on its way</Heading>

      <Text style={subheading}>
        The sender has dispatched a pack of TIP tracking labels to your address.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Dispatch</Text>
        <Text style={detailValueBold}>{shipmentName}</Text>

        {destinationAddress ? (
          <>
            <Text style={detailLabel}>Heading to</Text>
            <Text style={detailValue}>{destinationAddress}</Text>
          </>
        ) : null}
      </Section>

      <Text style={paragraph}>
        Typical delivery is 3–5 business days. You can follow the package live on the tracking
        page — we&apos;ll email you again as soon as it arrives.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Track Package
        </Button>
      </Section>

      <Text style={footerNote}>
        Powered by{' '}
        <Link href="https://tip.live" style={link}>
          TIP
        </Link>{' '}
        — door-to-door cargo tracking.{' '}
        <Link href={unsubscribeUrl} style={link}>
          Unsubscribe from this dispatch
        </Link>
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
  fontSize: '14px',
  color: '#334155',
  margin: '0 0 16px',
}
const detailValueBold = {
  fontSize: '16px',
  fontWeight: '600',
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

export default DispatchConsigneeInTransitEmail
