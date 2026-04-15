import { Button, Heading, Hr, Link, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

export interface DigestShipmentItem {
  name: string
  trackingUrl: string
  /** For pending: "created Apr 11"; for silent: "last seen Apr 13"; for stuck: "stuck 3d" */
  detail: string
  /** Optional city/country context for silent/stuck */
  locationLabel?: string
}

export interface ShipmentStatusDigestEmailProps {
  userName: string
  dashboardUrl: string
  preferencesUrl: string
  pending: DigestShipmentItem[]
  silent: DigestShipmentItem[]
  stuck: DigestShipmentItem[]
  /** Count only — unused labels don't list per-item */
  unusedLabels?: {
    count: number
    dashboardUrl: string
  }
  /** "Today's" or "This week's" — driven by cadence */
  cadenceLabel: string
}

export function ShipmentStatusDigestEmail({
  userName,
  dashboardUrl,
  preferencesUrl,
  pending,
  silent,
  stuck,
  unusedLabels,
  cadenceLabel,
}: ShipmentStatusDigestEmailProps) {
  return (
    <BaseLayout preview={`${cadenceLabel} shipment update`}>
      <Heading style={heading}>Hi {userName},</Heading>
      <Text style={intro}>
        Here&apos;s {cadenceLabel.toLowerCase()} update — a quick recap of what needs your attention.
      </Text>

      {pending.length > 0 && (
        <Section style={section}>
          <Text style={sectionTitle}>
            Awaiting first signal ({pending.length})
          </Text>
          {pending.map((item, idx) => (
            <Text key={idx} style={itemLine}>
              <Link href={item.trackingUrl} style={itemLink}>
                {item.name}
              </Link>
              <span style={itemDetail}> — {item.detail}</span>
            </Text>
          ))}
        </Section>
      )}

      {silent.length > 0 && (
        <Section style={section}>
          <Text style={sectionTitle}>
            Silent recently ({silent.length})
          </Text>
          {silent.map((item, idx) => (
            <Text key={idx} style={itemLine}>
              <Link href={item.trackingUrl} style={itemLink}>
                {item.name}
              </Link>
              <span style={itemDetail}>
                {' — '}
                {item.detail}
                {item.locationLabel ? ` near ${item.locationLabel}` : ''}
              </span>
            </Text>
          ))}
        </Section>
      )}

      {stuck.length > 0 && (
        <Section style={section}>
          <Text style={sectionTitle}>
            Not moving ({stuck.length})
          </Text>
          {stuck.map((item, idx) => (
            <Text key={idx} style={itemLine}>
              <Link href={item.trackingUrl} style={itemLink}>
                {item.name}
              </Link>
              <span style={itemDetail}>
                {' — '}
                {item.detail}
                {item.locationLabel ? ` at ${item.locationLabel}` : ''}
              </span>
            </Text>
          ))}
        </Section>
      )}

      {unusedLabels && unusedLabels.count > 0 && (
        <Section style={section}>
          <Text style={sectionTitle}>Unused labels</Text>
          <Text style={itemLine}>
            <Link href={unusedLabels.dashboardUrl} style={itemLink}>
              {unusedLabels.count} purchased{' '}
              {unusedLabels.count === 1 ? 'label' : 'labels'}
            </Link>
            <span style={itemDetail}> haven&apos;t been attached yet</span>
          </Text>
        </Section>
      )}

      <Hr style={hr} />

      <Text style={closer}>
        That&apos;s everything. We&apos;ll stay quiet until something changes.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={dashboardUrl}>
          Open dashboard
        </Button>
      </Section>

      <Text style={prefFooter}>
        Too many of these?{' '}
        <Link href={preferencesUrl} style={footerLink}>
          Adjust notification frequency
        </Link>
        .
      </Text>
    </BaseLayout>
  )
}

const heading = {
  fontSize: '22px',
  fontWeight: 'bold',
  color: '#0f172a',
  margin: '0 0 16px',
}

const intro = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#334155',
  margin: '0 0 24px',
}

const section = {
  margin: '0 0 20px',
}

const sectionTitle = {
  fontSize: '13px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: '#64748b',
  margin: '0 0 8px',
}

const itemLine = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#0f172a',
  margin: '4px 0',
}

const itemLink = {
  color: '#0f172a',
  fontWeight: '600' as const,
  textDecoration: 'none',
}

const itemDetail = {
  color: '#64748b',
  fontWeight: '400' as const,
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 0',
}

const closer = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#64748b',
  margin: '0 0 16px',
  fontStyle: 'italic' as const,
}

const buttonContainer = {
  margin: '16px 0 24px',
}

const button = {
  backgroundColor: '#00CC00',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
}

const prefFooter = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#94a3b8',
  margin: '0',
}

const footerLink = {
  color: '#64748b',
  textDecoration: 'underline',
}

export default ShipmentStatusDigestEmail
