import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface UnusedLabelsReminderEmailProps {
  userName: string
  labelCount: number
  deviceIds: string[]
  newShipmentUrl: string
}

export function UnusedLabelsReminderEmail({
  userName,
  labelCount,
  deviceIds,
  newShipmentUrl,
}: UnusedLabelsReminderEmailProps) {
  return (
    <BaseLayout
      preview={`You have ${labelCount} unused tracking label${labelCount === 1 ? '' : 's'}`}
    >
      <Heading style={heading}>Hi {userName},</Heading>

      <Text style={paragraph}>
        You have{' '}
        <strong>
          {labelCount} tracking label{labelCount === 1 ? '' : 's'}
        </strong>{' '}
        that {labelCount === 1 ? "hasn't" : "haven't"} been used yet.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Labels ready to use</Text>
        {deviceIds.map((id) => (
          <Text key={id} style={deviceIdText}>
            {id}
          </Text>
        ))}
      </Section>

      <Text style={paragraph}>
        Create a shipment to start tracking your cargo door-to-door.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={newShipmentUrl}>
          Create a Shipment
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
