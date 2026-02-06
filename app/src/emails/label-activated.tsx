import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface LabelActivatedEmailProps {
  shipmentName: string
  deviceId: string
  trackingUrl: string
  activatedAt: string
}

export function LabelActivatedEmail({
  shipmentName,
  deviceId,
  trackingUrl,
  activatedAt,
}: LabelActivatedEmailProps) {
  return (
    <BaseLayout preview={`Your label for "${shipmentName}" is now active`}>
      <Heading style={heading}>Label Activated</Heading>
      <Text style={paragraph}>
        Great news! Your tracking label has been activated and is now transmitting location
        data.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>

        <Text style={detailLabel}>Activated</Text>
        <Text style={detailValue}>{activatedAt}</Text>
      </Section>

      <Text style={paragraph}>
        You can now track your shipment in real-time using the link below.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Track Shipment
        </Button>
      </Section>

      <Text style={tipText}>
        Tip: Share the tracking link with your consignee so they can monitor delivery progress too.
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
  backgroundColor: '#2563eb',
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

export default LabelActivatedEmail
