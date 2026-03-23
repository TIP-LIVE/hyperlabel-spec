import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface ScriptReviewCompleteEmailProps {
  scriptTitle: string
  persona: string
  action: 'approved' | 'changes-requested'
  notes?: string
  scriptUrl: string
}

export function ScriptReviewCompleteEmail({
  scriptTitle,
  persona,
  action,
  notes,
  scriptUrl,
}: ScriptReviewCompleteEmailProps) {
  const isApproved = action === 'approved'

  return (
    <BaseLayout
      preview={
        isApproved
          ? `✅ Script approved: "${scriptTitle}"`
          : `📝 Changes requested: "${scriptTitle}"`
      }
    >
      <Section style={isApproved ? approvedBanner : changesBanner}>
        <Text style={icon}>{isApproved ? '✅' : '📝'}</Text>
        <Heading style={isApproved ? approvedHeading : changesHeading}>
          {isApproved ? 'Script Approved!' : 'Changes Requested'}
        </Heading>
      </Section>

      <Text style={paragraph}>
        {isApproved
          ? 'Great news! The interview script has been approved by the CEO. You can now use it in interviews.'
          : 'The CEO has reviewed the interview script and requested some changes. Please review the feedback and update the script.'}
      </Text>

      <Section style={detailsBox}>
        <Text style={detailLabel}>Script</Text>
        <Text style={detailValue}>{scriptTitle}</Text>

        <Text style={detailLabel}>Persona</Text>
        <Text style={detailValue}>{persona}</Text>

        <Text style={detailLabel}>Status</Text>
        <Text style={detailValue}>{isApproved ? 'Approved' : 'Changes Requested'}</Text>
      </Section>

      {notes && (
        <Section style={notesBox}>
          <Text style={detailLabel}>Reviewer Notes</Text>
          <Text style={notesText}>{notes}</Text>
        </Section>
      )}

      <Section style={buttonContainer}>
        <Button style={button} href={scriptUrl}>
          {isApproved ? 'View Script' : 'Edit Script'}
        </Button>
      </Section>
    </BaseLayout>
  )
}

const approvedBanner = {
  backgroundColor: '#dcfce7',
  borderRadius: '8px',
  padding: '24px',
  margin: '0 0 24px',
  textAlign: 'center' as const,
}

const changesBanner = {
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

const approvedHeading = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#166534',
  margin: '0',
}

const changesHeading = {
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

const notesBox = {
  backgroundColor: '#fffbeb',
  borderRadius: '8px',
  padding: '20px',
  margin: '0 0 24px',
  borderLeft: '4px solid #f59e0b',
}

const notesText = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#334155',
  margin: '8px 0 0',
  whiteSpace: 'pre-wrap' as const,
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

export default ScriptReviewCompleteEmail
