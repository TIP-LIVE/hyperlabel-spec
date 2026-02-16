import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ShipmentDeliveredEmailProps {
  shipmentName: string
  deviceId: string
  deliveredAt: string
  destination: string
  trackingUrl: string
}

export function ShipmentDeliveredEmail({
  shipmentName,
  deviceId,
  deliveredAt,
  destination,
  trackingUrl,
}: ShipmentDeliveredEmailProps) {
  return (
    <BaseLayout preview={`✅ "${shipmentName}" has been delivered`}>
      <Section style={successBanner}>
        <Text style={checkmark}>✅</Text>
        <Heading style={bannerHeading}>Shipment Delivered!</Heading>
      </Section>

      <Text style={paragraph}>
        Great news! Your shipment has arrived at its destination. The tracking label detected the
        delivery based on its location.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Destination</Text>
        <Text style={detailValue}>{destination}</Text>

        <Text style={detailLabel}>Delivered</Text>
        <Text style={detailValue}>{deliveredAt}</Text>

        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Delivery Details
        </Button>
      </Section>

      <Text style={noteText}>
        Note: The tracking label will continue transmitting until its battery is depleted. No
        action is required on your part.
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

export default ShipmentDeliveredEmail
