import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ConsigneeDeliveredEmailProps {
  shipmentName: string
  destinationAddress?: string | null
  deliveredAt: string
  trackingUrl: string
  unsubscribeUrl: string
}

export function ConsigneeDeliveredEmail({
  shipmentName,
  destinationAddress,
  deliveredAt,
  trackingUrl,
  unsubscribeUrl,
}: ConsigneeDeliveredEmailProps) {
  return (
    <BaseLayout preview={`"${shipmentName}" has been delivered`}>
      <Section style={successBanner}>
        <Text style={checkmark}>✅</Text>
        <Heading style={bannerHeading}>Shipment Delivered!</Heading>
      </Section>

      <Text style={subheading}>Your shipment has been marked as delivered</Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValueBold}>{shipmentName}</Text>

        {destinationAddress && (
          <>
            <Text style={detailLabel}>Delivered to</Text>
            <Text style={detailValue}>{destinationAddress}</Text>
          </>
        )}

        <Text style={detailLabel}>Delivered at</Text>
        <Text style={detailValue}>{deliveredAt}</Text>
      </Section>

      <Text style={paragraph}>
        The shipment has been marked as delivered, so you won&apos;t receive any more updates.
        The tracking link stays live for 90 days so you can review the full journey history
        whenever you need it.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Journey
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

const successBanner = {
  backgroundColor: '#dcfce7',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const checkmark = {
  fontSize: '48px',
  margin: '0 0 12px',
}

const bannerHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0',
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
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#16a34a',
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

const buttonContainer = {
  margin: '32px 0',
}

const button = {
  backgroundColor: '#16a34a',
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

export default ConsigneeDeliveredEmail
