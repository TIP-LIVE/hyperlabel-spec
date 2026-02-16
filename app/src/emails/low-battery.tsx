import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface LowBatteryEmailProps {
  shipmentName: string
  deviceId: string
  batteryLevel: number
  trackingUrl: string
  estimatedDaysRemaining?: number
}

export function LowBatteryEmail({
  shipmentName,
  deviceId,
  batteryLevel,
  trackingUrl,
  estimatedDaysRemaining,
}: LowBatteryEmailProps) {
  const isCritical = batteryLevel <= 10

  return (
    <BaseLayout
      preview={`${isCritical ? '⚠️ Critical' : '🔋 Low'} battery alert for "${shipmentName}"`}
    >
      <Heading style={heading}>
        {isCritical ? '⚠️ Critical Battery Alert' : '🔋 Low Battery Warning'}
      </Heading>

      <Text style={paragraph}>
        {isCritical
          ? 'Your tracking label battery is critically low and may stop transmitting soon.'
          : 'Your tracking label battery is running low. The label will continue tracking but you may want to monitor delivery progress closely.'}
      </Text>

      <Section style={isCritical ? criticalBox : warningBox}>
        <Text style={batteryText}>Battery Level</Text>
        <Text style={batteryValue}>{batteryLevel}%</Text>
        {estimatedDaysRemaining && (
          <Text style={estimateText}>
            Estimated {estimatedDaysRemaining} days of tracking remaining
          </Text>
        )}
      </Section>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Shipment</Text>
        <Text style={detailValue}>{shipmentName}</Text>

        <Text style={detailLabel}>Device ID</Text>
        <Text style={detailValue}>{deviceId}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          Check Current Location
        </Button>
      </Section>

      <Text style={noteText}>
        Note: Labels continue transmitting until the battery is fully depleted. After delivery, the
        label will naturally stop when the battery dies.
      </Text>
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

const warningBox = {
  backgroundColor: '#fef3c7',
  border: '1px solid #f59e0b',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const criticalBox = {
  backgroundColor: '#fee2e2',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const batteryText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 8px',
}

const batteryValue = {
  fontSize: '48px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 8px',
}

const estimateText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0',
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

const noteText = {
  fontSize: '14px',
  color: '#64748b',
  margin: '24px 0 0',
}

export default LowBatteryEmail
