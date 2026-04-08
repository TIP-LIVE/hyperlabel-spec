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
    <BaseLayout preview={`Your cargo shipment "${shipmentName}" is waiting for first signal`}>
      <Heading style={heading}>Hi {userName},</Heading>

      <Text style={paragraph}>
        Your cargo shipment <strong>&ldquo;{shipmentName}&rdquo;</strong> was created but
        we haven&apos;t received any location signal from the label yet.
      </Text>

      <Text style={paragraph}>
        <strong>Common reasons:</strong>
      </Text>

      <Section style={reasonsList}>
        <Text style={reasonItem}>
          • The label hasn&apos;t been <strong>physically activated</strong> yet — whoever has
          the label needs to pull the activation tab and attach it to the cargo.
        </Text>
        <Text style={reasonItem}>
          • The label hasn&apos;t arrived at the receiver yet — check the dispatch status in
          your dashboard.
        </Text>
        <Text style={reasonItem}>
          • The label was activated but is in an area with <strong>no cellular coverage</strong>
          {' '}— it will start reporting once it moves to a covered area.
        </Text>
      </Section>

      <Text style={paragraph}>
        As soon as the label sends its first location, the shipment will automatically switch
        to <strong>In Transit</strong> and you&apos;ll get a notification.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Shipment
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

const reasonsList = {
  margin: '8px 0 24px',
  paddingLeft: '8px',
}

const reasonItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#475569',
  margin: '10px 0',
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
