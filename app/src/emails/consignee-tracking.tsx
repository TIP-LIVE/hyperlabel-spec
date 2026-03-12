import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ConsigneeTrackingEmailProps {
  senderName: string
  shipmentName: string
  originAddress?: string | null
  destinationAddress?: string | null
  trackingUrl: string
  unsubscribeUrl: string
}

export function ConsigneeTrackingEmail({
  senderName,
  shipmentName,
  originAddress,
  destinationAddress,
  trackingUrl,
  unsubscribeUrl,
}: ConsigneeTrackingEmailProps) {
  return (
    <BaseLayout preview={`${senderName} shared a shipment tracking link with you`}>
      <Heading style={heading}>📦 Shipment on its way!</Heading>

      <Text style={subheading}>{senderName} is tracking a shipment for you</Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        {originAddress && (
          <>
            <Text style={detailLabel}>From</Text>
            <Text style={detailValue}>{originAddress}</Text>
          </>
        )}

        {destinationAddress && (
          <>
            <Text style={detailLabel}>To</Text>
            <Text style={detailValue}>{destinationAddress}</Text>
          </>
        )}
      </Section>

      <Text style={paragraph}>
        You can track this shipment in real-time using the link below. When it arrives, click{' '}
        <strong>&ldquo;Confirm Delivery&rdquo;</strong> to notify the sender and deactivate
        tracking.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Track My Shipment
        </Button>
      </Section>

      <Text style={footerNote}>
        You received this email because {senderName} shared a tracking link with you via{' '}
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

const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}

const link = {
  color: '#00CC00',
  textDecoration: 'underline',
}

export default ConsigneeTrackingEmail
