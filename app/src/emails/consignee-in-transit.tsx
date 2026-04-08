import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ConsigneeInTransitEmailProps {
  shipmentName: string
  originAddress?: string | null
  destinationAddress?: string | null
  trackingUrl: string
  unsubscribeUrl: string
}

export function ConsigneeInTransitEmail({
  shipmentName,
  originAddress,
  destinationAddress,
  trackingUrl,
  unsubscribeUrl,
}: ConsigneeInTransitEmailProps) {
  return (
    <BaseLayout preview={`Your shipment "${shipmentName}" is now in transit`}>
      <Heading style={heading}>🚛 Your shipment is moving!</Heading>

      <Text style={subheading}>
        We just received the first location signal — your cargo is on its way.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValueBold}>{shipmentName}</Text>

        {originAddress && destinationAddress ? (
          <>
            <Text style={detailLabel}>Route</Text>
            <Text style={detailValue}>
              {originAddress} → {destinationAddress}
            </Text>
          </>
        ) : destinationAddress ? (
          <>
            <Text style={detailLabel}>Heading to</Text>
            <Text style={detailValue}>{destinationAddress}</Text>
          </>
        ) : null}
      </Section>

      <Text style={paragraph}>
        Follow the shipment in real-time on the tracking page. When it arrives, you can press{' '}
        <strong>Confirm Delivery</strong> there to let the sender know it&apos;s been received.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Track Live
        </Button>
      </Section>

      <Text style={footerNote}>
        Powered by{' '}
        <Link href="https://tip.live" style={link}>
          TIP
        </Link>{' '}
        — door-to-door cargo tracking.{' '}
        <Link href={unsubscribeUrl} style={link}>
          Unsubscribe from this shipment
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
  backgroundColor: '#eff6ff',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#3b82f6',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const detailValue = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0 0 16px',
}

const detailValueBold = {
  fontSize: '16px',
  fontWeight: '600',
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

const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}

const link = {
  color: '#00CC00',
  textDecoration: 'underline',
}

export default ConsigneeInTransitEmail
