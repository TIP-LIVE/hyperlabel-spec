import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ShipmentStuckEmailProps {
  shipmentName: string
  deviceId: string
  stuckSinceHours: number
  lastLocation: string
  trackingUrl: string
}

export function ShipmentStuckEmail({
  shipmentName,
  deviceId,
  stuckSinceHours,
  lastLocation,
  trackingUrl,
}: ShipmentStuckEmailProps) {
  return (
    <BaseLayout preview={`"${shipmentName}" hasn't moved in ${stuckSinceHours} hours`}>
      <Heading style={heading}>⚠️ Shipment Stuck</Heading>

      <Text style={paragraph}>
        Your shipment <strong>&ldquo;{shipmentName}&rdquo;</strong> appears to be stuck — the
        tracking label hasn&apos;t moved significantly in the last{' '}
        <strong>{stuckSinceHours} hours</strong>.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Last Known Position</Text>
        <Text style={detailValue}>{lastLocation}</Text>

        <Text style={detailLabel}>Device</Text>
        <Text style={detailValueMono}>{deviceId}</Text>
      </Section>

      <Text style={paragraph}>This could mean:</Text>

      <Section style={reasonsList}>
        <Text style={reasonItem}>• The cargo is waiting at a warehouse or port</Text>
        <Text style={reasonItem}>• The shipment is delayed or held by customs</Text>
        <Text style={reasonItem}>• There may be an issue with delivery</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Tracking
        </Button>
      </Section>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 24px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}

const detailsBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#991b1b',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const detailValue = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0 0 16px',
}

const detailValueMono = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0 0 16px',
  fontFamily: 'monospace',
}

const reasonsList = {
  margin: '16px 0 24px',
  paddingLeft: '8px',
}

const reasonItem = {
  fontSize: '15px',
  color: '#475569',
  margin: '8px 0',
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

export default ShipmentStuckEmail
