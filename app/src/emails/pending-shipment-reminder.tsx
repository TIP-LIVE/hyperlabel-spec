import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface PendingShipmentReminderEmailProps {
  userName: string
  shipmentName: string
  trackingUrl: string
}

export function PendingShipmentReminderEmail({
  userName,
  shipmentName,
  trackingUrl,
}: PendingShipmentReminderEmailProps) {
  return (
    <BaseLayout preview={`Your shipment "${shipmentName}" is still pending`}>
      <Heading style={heading}>Hi {userName},</Heading>

      <Text style={paragraph}>
        Your shipment <strong>&ldquo;{shipmentName}&rdquo;</strong> was created but hasn&apos;t
        started moving yet.
      </Text>

      <Section style={tipBox}>
        <Text style={tipText}>
          💡 <strong>Tip:</strong> Peel the backing off your label and stick it on your cargo. Once
          it starts transmitting, the shipment will automatically switch to &ldquo;In Transit&rdquo;.
        </Text>
      </Section>

      <Text style={paragraph}>
        Share this tracking link with the recipient so they can follow the delivery:
      </Text>

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

const tipBox = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px 0',
}

const tipText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
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

export default PendingShipmentReminderEmail
