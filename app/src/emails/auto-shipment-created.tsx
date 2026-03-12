import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface AutoShipmentCreatedEmailProps {
  deviceId: string
  shipmentName: string
  trackingUrl: string
  createdAt: string
  locationCount: number
}

export function AutoShipmentCreatedEmail({
  deviceId,
  shipmentName,
  trackingUrl,
  createdAt,
  locationCount,
}: AutoShipmentCreatedEmailProps) {
  return (
    <BaseLayout preview={`A shipment was automatically created for label ${deviceId}`}>
      <Heading style={heading}>Shipment Auto-Created</Heading>
      <Text style={paragraph}>
        Your tracking label <strong>{deviceId}</strong> has been reporting location data for
        over 48 hours without a shipment. We&apos;ve automatically created one for you.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>

        <Text style={detailLabel}>Created</Text>
        <Text style={detailValue}>{createdAt}</Text>

        <Text style={detailLabel}>Location History</Text>
        <Text style={detailValue}>{locationCount} location point{locationCount !== 1 ? 's' : ''} recorded</Text>
      </Section>

      <Text style={paragraph}>
        Log in to your TIP dashboard to add cargo details, destination, and consignee
        information.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Shipment
        </Button>
      </Section>

      <Text style={tipText}>
        All location data from the label&apos;s activation has been preserved in this shipment.
      </Text>
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

const tipText = {
  fontSize: '14px',
  color: '#64748b',
  fontStyle: 'italic',
  margin: '24px 0 0',
}

export default AutoShipmentCreatedEmail
