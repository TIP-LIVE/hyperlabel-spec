import { Heading, Hr, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

export type Severity = 'ok' | 'warning' | 'critical'

export interface ReportCategory {
  name: string
  severity: Severity
  headline: string
  details: string[]
}

interface WatchdogReportEmailProps {
  generatedAt: string
  categories: ReportCategory[]
}

const severityIcon: Record<Severity, string> = {
  ok: '\u2713',
  warning: '\u26A0',
  critical: '\u2717',
}

const severityColors: Record<Severity, { bg: string; border: string; accent: string }> = {
  ok: { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a' },
  warning: { bg: '#fffbeb', border: '#fde68a', accent: '#d97706' },
  critical: { bg: '#fef2f2', border: '#fecaca', accent: '#dc2626' },
}

export function WatchdogReportEmail({ generatedAt, categories }: WatchdogReportEmailProps) {
  const worstSeverity = categories.reduce<Severity>((worst, cat) => {
    if (cat.severity === 'critical') return 'critical'
    if (cat.severity === 'warning' && worst !== 'critical') return 'warning'
    return worst
  }, 'ok')

  return (
    <BaseLayout preview={`Daily System Report — ${generatedAt}`}>
      <Heading style={heading}>Daily Watchdog Report</Heading>
      <Text style={subheading}>{generatedAt}</Text>

      {/* Overall status badge */}
      <Section
        style={{
          ...statusBadge,
          backgroundColor: severityColors[worstSeverity].bg,
          borderColor: severityColors[worstSeverity].border,
        }}
      >
        <Text
          style={{
            ...statusText,
            color: severityColors[worstSeverity].accent,
          }}
        >
          {worstSeverity === 'ok'
            ? 'All Systems Healthy'
            : worstSeverity === 'warning'
              ? 'Warnings Detected'
              : 'CRITICAL Issues Detected'}
        </Text>
      </Section>

      {/* Summary bar */}
      <Section style={summaryBox}>
        {categories.map((cat, i) => (
          <Text key={i} style={summaryLine}>
            <span style={{ color: severityColors[cat.severity].accent, fontWeight: 'bold' }}>
              {severityIcon[cat.severity]}
            </span>
            {'  '}
            <strong>{cat.name}:</strong> {cat.headline}
          </Text>
        ))}
      </Section>

      {/* Detailed sections */}
      {categories.map((cat, i) => (
        <React.Fragment key={i}>
          <Hr style={hr} />
          <Section
            style={{
              ...categorySection,
              backgroundColor: severityColors[cat.severity].bg,
              borderColor: severityColors[cat.severity].border,
            }}
          >
            <Text
              style={{
                ...categoryHeading,
                color: severityColors[cat.severity].accent,
              }}
            >
              {severityIcon[cat.severity]} {cat.name}
            </Text>
            <Text style={categoryHeadline}>{cat.headline}</Text>
            {cat.details.length > 0
              ? cat.details.map((detail, j) => (
                  <Text key={j} style={detailText}>
                    {'\u2022'} {detail}
                  </Text>
                ))
              : (
                  <Text style={detailText}>No issues detected.</Text>
                )}
          </Section>
        </React.Fragment>
      ))}
    </BaseLayout>
  )
}

const heading = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 8px',
}

const subheading = {
  fontSize: '14px',
  color: '#64748b',
  margin: '0 0 24px',
}

const statusBadge = {
  borderRadius: '8px',
  padding: '12px 20px',
  margin: '0 0 24px',
  border: '1px solid',
  textAlign: 'center' as const,
}

const statusText = {
  fontSize: '18px',
  fontWeight: 'bold' as const,
  margin: '0',
}

const summaryBox = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 8px',
  border: '1px solid #e2e8f0',
}

const summaryLine = {
  fontSize: '14px',
  color: '#334155',
  margin: '4px 0',
  lineHeight: '22px',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '16px 0',
}

const categorySection = {
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 8px',
  border: '1px solid',
}

const categoryHeading = {
  fontSize: '12px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  margin: '0 0 4px',
  letterSpacing: '0.05em',
}

const categoryHeadline = {
  fontSize: '16px',
  fontWeight: '600' as const,
  color: '#0f172a',
  margin: '0 0 8px',
}

const detailText = {
  fontSize: '14px',
  color: '#475569',
  margin: '2px 0',
  lineHeight: '20px',
}

export default WatchdogReportEmail
