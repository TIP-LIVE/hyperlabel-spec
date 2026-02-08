import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface LowInventoryEmailProps {
  availableLabels: number
  requestedQuantity: number
  assignedQuantity: number
  orderId: string
  orderUserEmail: string
  dashboardUrl: string
}

export function LowInventoryEmail({
  availableLabels,
  requestedQuantity,
  assignedQuantity,
  orderId,
  orderUserEmail,
  dashboardUrl,
}: LowInventoryEmailProps) {
  const shortfall = requestedQuantity - assignedQuantity

  return (
    <BaseLayout preview={`Low inventory alert — only ${availableLabels} labels remaining`}>
      <Heading style={heading}>Low Label Inventory</Heading>

      <Text style={paragraph}>
        A new order was placed but there aren&apos;t enough labels in inventory to fully fulfill it.
        Manual intervention is required.
      </Text>

      <Section style={alertBox}>
        <Text style={alertLabel}>Status</Text>
        <Text style={alertValue}>
          {assignedQuantity > 0
            ? `Partially fulfilled (${assignedQuantity} of ${requestedQuantity} assigned)`
            : `No labels available (${requestedQuantity} requested)`}
        </Text>

        <Text style={alertLabel}>Shortfall</Text>
        <Text style={alertValue}>{shortfall} label{shortfall !== 1 ? 's' : ''} needed</Text>

        <Text style={alertLabel}>Remaining Inventory</Text>
        <Text style={alertValue}>{availableLabels - assignedQuantity} labels</Text>

        <Text style={alertLabel}>Order ID</Text>
        <Text style={{ ...alertValue, fontFamily: 'monospace', fontSize: '14px' }}>
          {orderId}
        </Text>

        <Text style={alertLabel}>Customer</Text>
        <Text style={alertValue}>{orderUserEmail}</Text>
      </Section>

      <Text style={paragraph}>
        <strong>Action required:</strong> Replenish label inventory and manually assign labels to this order.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Go to Admin Dashboard
        </Button>
      </Section>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#991b1b',
  margin: '0 0 24px',
}

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  color: '#334155',
  margin: '0 0 16px',
}

const alertBox = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  border: '1px solid #fecaca',
}

const alertLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#991b1b',
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
}

const alertValue = {
  fontSize: '16px',
  color: '#0f172a',
  margin: '0 0 16px',
}

const buttonContainer = {
  margin: '32px 0',
}

const button = {
  backgroundColor: '#dc2626',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
}

export default LowInventoryEmail
