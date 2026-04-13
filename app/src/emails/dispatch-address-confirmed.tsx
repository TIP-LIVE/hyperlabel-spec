import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchAddressConfirmedEmailProps {
  receiverName: string
  destinationAddress: string
  trackingUrl: string
}

export function DispatchAddressConfirmedEmail({
  receiverName,
  destinationAddress,
  trackingUrl,
}: DispatchAddressConfirmedEmailProps) {
  return (
    <BaseLayout preview="We received your address — your TIP labels will ship soon">
      <Heading style={heading}>📦 Address received</Heading>
      <Text style={subheading}>
        Thanks, {receiverName}! Your TIP tracking labels will be shipped within 1 business day.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Delivery Address</Text>
        <Text style={detailValue}>{destinationAddress}</Text>
      </Section>

      <Text style={paragraph}>
        You can follow the dispatch status using the link below. We&apos;ll notify you when your
        labels are on the way.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Track Dispatch
        </Button>
      </Section>

      <Text style={footerNote}>
        Powered by{' '}
        <Link href="https://tip.live" style={link}>
          TIP
        </Link>{' '}
        — door-to-door cargo tracking.
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 8px',
  textAlign: 'center' as const,
}

const subheading = {
  fontSize: '16px',
  color: '#64748b',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}

const detailsBox = {
  backgroundColor: '#f0fdf4',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const detailLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#16a34a',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const detailValue = {
  fontSize: '16px',
  color: '#0f172a',
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

const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}

const link = {
  color: '#00CC00',
  textDecoration: 'underline',
}

export default DispatchAddressConfirmedEmail
