import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface NoSignalEmailProps {
  shipmentName: string
  deviceId: string
  lastSeenAt: string
  lastLocation?: string
  trackingUrl: string
}

export function NoSignalEmail({
  shipmentName,
  deviceId,
  lastSeenAt,
  lastLocation,
  trackingUrl,
}: NoSignalEmailProps) {
  return (
    <BaseLayout preview={`No signal from "${shipmentName}" tracking label`}>
      <Heading style={heading}>📡 No Signal Alert</Heading>

      <Text style={paragraph}>
        We haven&apos;t received any location updates from your tracking label in the last 24
        hours. This could be due to:
      </Text>

      <Section style={reasonsList}>
        <Text style={reasonItem}>• The shipment is in an area with no cellular coverage</Text>
        <Text style={reasonItem}>• The label is inside a shielded container</Text>
        <Text style={reasonItem}>• The battery has been depleted</Text>
      </Section>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>

        <Text style={detailLabel}>Last Seen</Text>
        <Text style={detailValue}>{lastSeenAt}</Text>

        {lastLocation && (
          <>
            <Text style={detailLabel}>Last Known Location</Text>
            <Text style={detailValue}>{lastLocation}</Text>
          </>
        )}
      </Section>

      <Text style={paragraph}>
        The label will automatically resume transmitting when it regains cellular connectivity.
        We&apos;ll notify you when we receive new location data.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Last Known Location
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
  margin: '16px 0 24px',
  paddingLeft: '8px',
}

const reasonItem = {
  fontSize: '15px',
  color: '#475569',
  margin: '8px 0',
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

export default NoSignalEmail
