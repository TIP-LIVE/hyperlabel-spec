import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ShipmentDeliveredEmailProps {
  shipmentName: string
  deviceId: string
  deliveredAt: string
  destination: string
  trackingUrl: string
  /** 'auto' = cell-tower proximity detection. 'manual' = consignee pressed Confirm Delivery. */
  source?: 'auto' | 'manual'
}

export function ShipmentDeliveredEmail({
  shipmentName,
  deviceId,
  deliveredAt,
  destination,
  trackingUrl,
  source = 'auto',
}: ShipmentDeliveredEmailProps) {
  const isAuto = source === 'auto'
  return (
    <BaseLayout preview={`✅ "${shipmentName}" has been delivered`}>
      <Section style={successBanner}>
        <Text style={checkmark}>✅</Text>
        <Heading style={bannerHeading}>Shipment Delivered!</Heading>
      </Section>

      <Text style={paragraph}>
        {isAuto ? (
          <>
            Your shipment looks like it has arrived at its destination. The tracking label is
            reporting from within ~1.5 km of the drop-off address, and cell-tower triangulation
            has a typical accuracy of 500–1000 m — so please review the location before
            treating this as final.
          </>
        ) : (
          <>
            Your consignee has confirmed delivery of your shipment. The journey history is
            preserved below so you can review the route.
          </>
        )}
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Destination</Text>
        <Text style={detailValue}>{destination}</Text>

        <Text style={detailLabel}>Delivered</Text>
        <Text style={detailValue}>{deliveredAt}</Text>

        <Text style={detailLabel}>Label</Text>
        <Text style={detailValue}>{deviceId}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          {isAuto ? 'Review & Confirm Delivery' : 'View Delivery Details'}
        </Button>
      </Section>

      <Text style={noteText}>
        {isAuto
          ? 'If this is wrong, open the tracking page and the shipment will stay In Transit. The label keeps transmitting until the battery runs out, so the location will keep updating.'
          : 'The label keeps transmitting until the battery runs out, so you can continue to see its location on the tracking page.'}
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
