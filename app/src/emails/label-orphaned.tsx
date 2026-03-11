import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface LabelOrphanedEmailProps {
  deviceId: string
  claimUrl: string
  detectedAt: string
  expiresIn: string
  locationHint?: string
}

export function LabelOrphanedEmail({
  deviceId,
  claimUrl,
  detectedAt,
  expiresIn,
  locationHint,
}: LabelOrphanedEmailProps) {
  return (
    <BaseLayout preview={`Label ${deviceId} activated without a shipment`}>
      <Heading style={heading}>Label Activated Without Shipment</Heading>
      <Text style={paragraph}>
        Your tracking label <strong>{deviceId}</strong> was physically activated and is now
        transmitting location data, but no shipment has been created for it yet.
      </Text>

      <Section style={warningBox}>
        <Text style={warningText}>
          Create a shipment within {expiresIn} to link this label to your cargo.
          After that, a shipment will be automatically created for you.
        </Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>

        <Text style={detailLabel}>Detected At</Text>
        <Text style={detailValue}>{detectedAt}</Text>

        {locationHint && (
          <>
            <Text style={detailLabel}>Approximate Location</Text>
            <Text style={detailValue}>{locationHint}</Text>
          </>
        )}
      </Section>

      <Text style={paragraph}>
        Use the link below to create a shipment — no login required during the claim window.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={claimUrl}>
          Create Shipment
        </Button>
      </Section>

      <Text style={tipText}>
        You can also log in to your TIP dashboard and create a shipment from there.
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

const warningBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const warningText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
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

export default LabelOrphanedEmail
