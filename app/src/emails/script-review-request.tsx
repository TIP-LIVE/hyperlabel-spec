import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ScriptReviewRequestEmailProps {
  scriptTitle: string
  persona: string
  reviewUrl: string
}

export function ScriptReviewRequestEmail({
  scriptTitle,
  persona,
  reviewUrl,
}: ScriptReviewRequestEmailProps) {
  return (
    <BaseLayout preview={`📋 Review requested: "${scriptTitle}" interview script`}>
      <Section style={banner}>
        <Text style={icon}>📋</Text>
        <Heading style={bannerHeading}>Script Review Requested</Heading>
      </Section>

      <Text style={paragraph}>
        An interview script has been submitted for your review. Please review the questions
        and either approve them or request changes before we begin interviewing.
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Script</Text>
        <Text style={detailValue}>{scriptTitle}</Text>

        <Text style={detailLabel}>Persona</Text>
        <Text style={detailValue}>{persona}</Text>
      </Section>

      <Section style={buttonContainer}>
        <Button style={button} href={reviewUrl}>
          Review Script
        </Button>
      </Section>

      <Text style={noteText}>
        Your review ensures our interview questions align with business strategy and cover
        the right topics before we start talking to potential users.
      </Text>
    </BaseLayout>
  )
}

const banner = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const icon = {
  fontSize: '48px',
  margin: '0 0 12px',
}

const bannerHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#92400e',
  margin: '0',
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

export default ScriptReviewRequestEmail
