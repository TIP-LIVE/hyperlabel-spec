import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface UnusedLabelsReminderEmailProps {
  userName: string
  labelCount: number
  deviceIds: string[]
  dashboardUrl: string
}

export function UnusedLabelsReminderEmail({
  userName,
  labelCount,
  deviceIds,
  dashboardUrl,
}: UnusedLabelsReminderEmailProps) {
  const plural = labelCount !== 1
  return (
    <BaseLayout
      preview={`You have ${labelCount} purchased label${plural ? 's' : ''} waiting for the next step`}
    >
      <Heading style={heading}>Hi {userName},</Heading>

      <Text style={paragraph}>
        You have{' '}
        <strong>
          {labelCount} purchased tracking label{plural ? 's' : ''}
        </strong>{' '}
        waiting for the next step in the journey.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Your labels</Text>
        {deviceIds.map((id) => (
          <Text key={id} style={deviceIdText}>
            {id}
          </Text>
        ))}
      </Section>

      <Text style={paragraph}>
        <strong>Where are they in the journey?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>
          • If they&apos;re still at our warehouse — set up a <strong>dispatch</strong> so we can ship them
          to your office, a forwarder, or your supplier.
        </Text>
        <Text style={stepItem}>
          • If they&apos;ve already arrived at the receiver — create a{' '}
          <strong>cargo shipment</strong> and link a label to the cargo you want to track.
        </Text>
      </Section>

      <Text style={paragraph}>
        Your dashboard will show you the right next step for each label.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Go to Dashboard
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
  margin: '0 0 8px',
}

const deviceIdText = {
  fontSize: '14px',
  color: '#0f172a',
  margin: '4px 0',
  fontFamily: 'monospace',
}

const stepsList = {
  margin: '8px 0 24px',
  paddingLeft: '8px',
}

const stepItem = {
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

export default UnusedLabelsReminderEmail
