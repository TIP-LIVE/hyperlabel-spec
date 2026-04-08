import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchDeliveredEmailProps {
  dispatchName: string
  receiverName: string
  destinationAddress: string
  deliveredAt: string
  cargoUrl: string
}

export function DispatchDeliveredEmail({
  dispatchName,
  receiverName,
  destinationAddress,
  deliveredAt,
  cargoUrl,
}: DispatchDeliveredEmailProps) {
  return (
    <BaseLayout preview={`✅ Your TIP labels for "${dispatchName}" have arrived`}>
      <Section style={successBanner}>
        <Text style={checkmark}>✅</Text>
        <Heading style={bannerHeading}>Labels delivered!</Heading>
      </Section>

      <Text style={paragraph}>
        Your TIP labels for <strong>{dispatchName}</strong> have arrived at{' '}
        <strong>{receiverName}</strong>. Time to activate them and start tracking your cargo.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Receiver</Text>
        <Text style={detailValue}>{receiverName}</Text>

        <Text style={detailLabel}>Delivered To</Text>
        <Text style={detailValue}>{destinationAddress}</Text>

        <Text style={detailLabel}>Delivered</Text>
        <Text style={detailValue}>{deliveredAt}</Text>
      </Section>

      <Text style={paragraph}>
        <strong>What&apos;s next?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>1. Find the TIP box and open it</Text>
        <Text style={stepItem}>2. Stick a label on the cargo you want to track</Text>
        <Text style={stepItem}>3. Create a cargo shipment in your dashboard to link the label</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={cargoUrl}>
          Create Cargo Shipment
        </Button>
      </Section>
    </BaseLayout>
  )
}

const successBanner = {
  backgroundColor: '#dcfce7',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}
const checkmark = {
  fontSize: '48px',
  margin: '0 0 12px',
}
const bannerHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0',
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
const stepsList = {
  margin: '16px 0 24px',
  paddingLeft: '8px',
}
const stepItem = {
  fontSize: '15px',
  color: '#475569',
  margin: '8px 0',
}
const buttonContainer = { margin: '32px 0' }
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

export default DispatchDeliveredEmail
