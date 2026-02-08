import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface OrderConfirmedEmailProps {
  orderNumber: string
  quantity: number
  totalAmount: string
  shippingName: string
  shippingAddress: string
  dashboardUrl: string
}

export function OrderConfirmedEmail({
  orderNumber,
  quantity,
  totalAmount,
  shippingName,
  shippingAddress,
  dashboardUrl,
}: OrderConfirmedEmailProps) {
  return (
    <BaseLayout preview={`Order confirmed — ${quantity} tracking label${quantity > 1 ? 's' : ''}`}>
      <Heading style={heading}>Order Confirmed!</Heading>

      <Text style={paragraph}>
        Thank you for your purchase! We&apos;ve received your order and will ship your tracking
        label{quantity > 1 ? 's' : ''} within 3-5 business days.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Order Number</Text>
        <Text style={detailValue}>#{orderNumber}</Text>

        <Text style={detailLabel}>Quantity</Text>
        <Text style={detailValue}>{quantity} tracking label{quantity > 1 ? 's' : ''}</Text>

        <Text style={detailLabel}>Total</Text>
        <Text style={detailValue}>{totalAmount}</Text>

        <Text style={detailLabel}>Ship To</Text>
        <Text style={detailValue}>{shippingName}</Text>
        <Text style={{ ...detailValue, marginTop: '-12px', color: '#64748b', fontSize: '14px' }}>
          {shippingAddress}
        </Text>
      </Section>

      <Text style={paragraph}>
        <strong>What happens next?</strong>
      </Text>

      <Section style={stepsList}>
        <Text style={stepItem}>1. We&apos;ll prepare and ship your labels (3-5 business days)</Text>
        <Text style={stepItem}>2. You&apos;ll get a shipping confirmation email with tracking</Text>
        <Text style={stepItem}>3. Once delivered, create a shipment in your dashboard</Text>
        <Text style={stepItem}>4. Peel the label, attach to your cargo, and start tracking!</Text>
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
  backgroundColor: '#2563eb',
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
