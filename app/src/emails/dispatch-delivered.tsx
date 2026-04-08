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
        <strong>{receiverName}</strong>. Here&apos;s how to get them activated and start tracking
        your cargo.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Receiver</Text>
        <Text style={detailValue}>{receiverName}</Text>

        <Text style={detailLabel}>Delivered To</Text>
        <Text style={detailValue}>{destinationAddress}</Text>

        <Text style={detailLabel}>Delivered</Text>
        <Text style={detailValue}>{deliveredAt}</Text>
      </Section>

      <Text style={sectionHeading}>What the receiver does</Text>
      <Section style={stepsList}>
        <Text style={stepItem}>1. Opens the TIP box</Text>
        <Text style={stepItem}>2. Pulls the activation tab on a label</Text>
        <Text style={stepItem}>3. Sticks it on the cargo that needs tracking</Text>
      </Section>

      <Text style={sectionHeading}>What you do</Text>
      <Section style={stepsList}>
        <Text style={stepItem}>
          1. Create a cargo shipment in your dashboard and link the activated label
        </Text>
        <Text style={stepItem}>
          2. Share the tracking link with your consignee so they can follow along
        </Text>
      </Section>

      <Text style={tipText}>
        Not sure who&apos;s doing what? Forward this email to {receiverName} so they know what to
        expect when the TIP box arrives.
      </Text>

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
const sectionHeading = {
  fontSize: '14px',
  fontWeight: '700' as const,
  color: '#0f172a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  margin: '24px 0 8px',
}
const tipText = {
  fontSize: '14px',
  color: '#64748b',
  fontStyle: 'italic' as const,
  margin: '16px 0 0',
}
const stepsList = {
  margin: '0 0 16px',
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
