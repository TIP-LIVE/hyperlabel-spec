import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface RoleChangedEmailProps {
  userName: string
  newRole: 'admin' | 'user'
  changedByName: string
  dashboardUrl: string
}

export function RoleChangedEmail({
  userName,
  newRole,
  changedByName,
  dashboardUrl,
}: RoleChangedEmailProps) {
  const isPromotion = newRole === 'admin'

  return (
    <BaseLayout
      preview={
        isPromotion
          ? 'You have been granted admin access to TIP'
          : 'Your admin access to TIP has been removed'
      }
    >
      <Heading style={heading}>
        {isPromotion ? 'Welcome to the Admin Team!' : 'Admin Access Removed'}
      </Heading>

      <Text style={paragraph}>
        Hi {userName},
      </Text>

      {isPromotion ? (
        <>
          <Text style={paragraph}>
            <strong>{changedByName}</strong> has granted you <strong>admin access</strong> to the TIP
            platform. You now have access to:
          </Text>

          <Section style={detailsBox}>
            <Text style={featureItem}>✅ User management — view and manage all users</Text>
            <Text style={featureItem}>✅ Order management — view and update all orders</Text>
            <Text style={featureItem}>✅ Label inventory — manage label stock and assignments</Text>
            <Text style={featureItem}>✅ Platform overview — analytics and system health</Text>
          </Section>

          <Text style={paragraph}>
            You can access the admin panel from the sidebar in your dashboard.
          </Text>
        </>
      ) : (
        <>
          <Text style={paragraph}>
            <strong>{changedByName}</strong> has removed your admin access. You still have full
            access to your own shipments, labels, and orders.
          </Text>

          <Section style={detailsBox}>
            <Text style={detailLabel}>What changed</Text>
            <Text style={detailValue}>
              Admin panel access has been revoked. All your personal data and shipments remain unchanged.
            </Text>
          </Section>
        </>
      )}

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

const featureItem = {
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

export default RoleChangedEmail
