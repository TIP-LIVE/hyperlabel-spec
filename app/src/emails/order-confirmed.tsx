import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface OrderConfirmedEmailProps {
  orderNumber: string
  quantity: number
  totalAmount: string
  dashboardUrl: string
}

export function OrderConfirmedEmail({
  orderNumber,
  quantity,
  totalAmount,
  dashboardUrl,
}: OrderConfirmedEmailProps) {
  return (
    <BaseLayout preview={`Order confirmed — ${quantity} tracking label${quantity > 1 ? 's' : ''}`}>
      <Heading style={heading}>Order Confirmed!</Heading>

      <Text style={paragraph}>
        Thank you for your purchase! Your tracking label{quantity > 1 ? 's are' : ' is'} now
        available in your dashboard.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Order Number</Text>
        <Text style={detailValue}>#{orderNumber}</Text>

        <Text style={detailLabel}>Quantity</Text>
        <Text style={detailValue}>{quantity} tracking label{quantity > 1 ? 's' : ''}</Text>

        <Text style={detailLabel}>Total</Text>
        <Text style={detailValue}>{totalAmount}</Text>
      </Section>

      <Text style={paragraph}>
        <strong>What happens next?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>1. Your labels are now in your dashboard</Text>
        <Text style={stepItem}>2. Create a shipment and assign a label to it</Text>
        <Text style={stepItem}>3. Share the tracking link with your shipper</Text>
        <Text style={stepItem}>4. Track your cargo in real-time until delivery</Text>
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

export default OrderConfirmedEmail
