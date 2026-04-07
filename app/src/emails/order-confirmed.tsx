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
        Thank you for your purchase! Your label{quantity > 1 ? 's are' : ' is'} reserved at
        our warehouse, ready to be dispatched wherever you need them.
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
        <Text style={stepItem}>1. Your order is being prepared at our warehouse</Text>
        <Text style={stepItem}>
          2. Tell us where to dispatch the label{quantity > 1 ? 's' : ''} — your office,
          a forwarder, a supplier, anywhere
        </Text>
        <Text style={stepItem}>
          3. We physically ship the label{quantity > 1 ? 's' : ''} to that address
          (3–5 business days)
        </Text>
        <Text style={stepItem}>4. The receiver activates a label and sticks it on the cargo</Text>
        <Text style={stepItem}>5. Track door-to-door in real time</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Set Up Dispatch
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
