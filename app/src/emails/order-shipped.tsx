import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface OrderShippedEmailProps {
  orderNumber: string
  quantity: number
  trackingNumber?: string
  trackingUrl?: string
  dashboardUrl: string
}

export function OrderShippedEmail({
  orderNumber,
  quantity,
  trackingNumber,
  trackingUrl,
  dashboardUrl,
}: OrderShippedEmailProps) {
  return (
    <BaseLayout preview={`Your TIP labels for order #${orderNumber} are being dispatched`}>
      <Heading style={heading}>🚛 Your Labels Are Being Dispatched</Heading>

      <Text style={paragraph}>
        Good news — your TIP labels have left our warehouse and are on their way to the
        address you set up.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Order Number</Text>
        <Text style={detailValue}>#{orderNumber}</Text>

        <Text style={detailLabel}>Quantity</Text>
        <Text style={detailValue}>
          {quantity} label{quantity > 1 ? 's' : ''}
        </Text>

        {trackingNumber && (
          <>
            <Text style={detailLabel}>Courier Tracking</Text>
            <Text style={detailValue}>{trackingNumber}</Text>
          </>
        )}
      </Section>

      {trackingNumber && trackingUrl && (
        <Section style={buttonContainer}>
          <Button style={secondaryButton} href={trackingUrl}>
            Track Courier
          </Button>
        </Section>
      )}

      <Text style={paragraph}>
        <strong>What happens next?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>
          1. Labels typically arrive at the dispatch address in 3–5 business days
        </Text>
        <Text style={stepItem}>
          2. Whoever receives the TIP box opens it and pulls the activation tab on a label
        </Text>
        <Text style={stepItem}>
          3. The label starts transmitting as soon as it&apos;s attached to the cargo
        </Text>
        <Text style={stepItem}>
          4. You create a cargo shipment from your dashboard and link the active label
        </Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          View Dispatch
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

const buttonContainer = {
  margin: '24px 0',
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

const secondaryButton = {
  backgroundColor: '#f1f5f9',
  borderRadius: '8px',
  color: '#334155',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

export default OrderShippedEmail
