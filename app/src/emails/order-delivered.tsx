import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface OrderDeliveredEmailProps {
  orderNumber: string
  quantity: number
  dashboardUrl: string
}

export function OrderDeliveredEmail({
  orderNumber,
  quantity,
  dashboardUrl,
}: OrderDeliveredEmailProps) {
  return (
    <BaseLayout preview={`Your TIP labels from order #${orderNumber} have been delivered`}>
      <Heading style={heading}>Your Labels Have Arrived</Heading>

      <Text style={paragraph}>
        All labels from order <strong>#{orderNumber}</strong> have been delivered
        to their destination.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Order Number</Text>
        <Text style={detailValue}>#{orderNumber}</Text>

        <Text style={detailLabel}>Quantity</Text>
        <Text style={detailValue}>
          {quantity} label{quantity > 1 ? 's' : ''}
        </Text>
      </Section>

      <Text style={paragraph}>
        <strong>Ready to start tracking?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>
          1. Open the TIP box and pull the activation tab on a label
        </Text>
        <Text style={stepItem}>
          2. Attach the label to the cargo you want to track
        </Text>
        <Text style={stepItem}>
          3. Create a cargo shipment from your dashboard and link the active label
        </Text>
      </Section>

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

export default OrderDeliveredEmail
