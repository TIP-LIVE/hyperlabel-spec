import { Button, Heading, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface DispatchCancelledEmailProps {
  dispatchName: string
  labelCount: number
  dispatchListUrl: string
  supportEmail: string
}

export function DispatchCancelledEmail({
  dispatchName,
  labelCount,
  dispatchListUrl,
  supportEmail,
}: DispatchCancelledEmailProps) {
  return (
    <BaseLayout preview={`Your dispatch "${dispatchName}" has been cancelled`}>
      <Heading style={heading}>Dispatch cancelled</Heading>
      <Text style={subheading}>
        Your label dispatch <strong>{dispatchName}</strong> has been cancelled and the labels have
        been released back to your account.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Dispatch</Text>
        <Text style={detailValue}>{dispatchName}</Text>
        <Text style={detailLabel}>Labels Released</Text>
        <Text style={detailValue}>
          {labelCount} label{labelCount === 1 ? '' : 's'}
        </Text>
      </Section>

      <Text style={paragraph}>
        You can create a new dispatch with the same labels at any time from your dashboard.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dispatchListUrl}>
          View Dispatches
        </Button>
      </Section>

      <Text style={footerNote}>
        Didn&apos;t expect this? Contact us at{' '}
        <Link href={`mailto:${supportEmail}`} style={link}>
          {supportEmail}
        </Link>{' '}
        and we&apos;ll investigate.
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
const footerNote = {
  fontSize: '12px',
  color: '#94a3b8',
  margin: '32px 0 0',
}
const link = {
  color: '#00CC00',
  textDecoration: 'underline',
}

export default DispatchCancelledEmail
