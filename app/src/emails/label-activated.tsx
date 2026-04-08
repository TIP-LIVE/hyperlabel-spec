import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface LabelActivatedEmailProps {
  shipmentName: string
  deviceId: string
  trackingUrl: string
  createdAt: string
}

export function LabelActivatedEmail({
  shipmentName,
  deviceId,
  trackingUrl,
  createdAt,
}: LabelActivatedEmailProps) {
  return (
    <BaseLayout preview={`Cargo shipment "${shipmentName}" is ready — waiting for first signal`}>
      <Heading style={heading}>Cargo Shipment Created</Heading>
      <Text style={paragraph}>
        You&apos;ve linked a tracking label to your cargo. As soon as the label reports its
        first location, your shipment will switch to <strong>In Transit</strong> and we&apos;ll
        notify you.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Label</Text>
        <Text style={detailValue}>{deviceId}</Text>

        <Text style={detailLabel}>Created</Text>
        <Text style={detailValue}>{createdAt}</Text>
      </Section>

      <Text style={paragraph}>
        If you haven&apos;t already, peel the activation tab on the label and attach it to
        your cargo. You can follow the shipment live using the link below.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Shipment
        </Button>
      </Section>

      <Text style={tipText}>
        Hint: Share the tracking link with your consignee so they can monitor delivery progress too.
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

export default LabelActivatedEmail
