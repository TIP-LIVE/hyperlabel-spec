import { Button, Heading, Section, Text } from '@react-email/components'
import * as React from 'react'
import { BaseLayout } from './base-layout'

interface PendingShipmentReminderEmailProps {
  userName: string
  shipmentName: string
  trackingUrl: string
  /** Whole days elapsed since the label was ready (cargo createdAt or dispatch deliveredAt). */
  daysSinceReady?: number
  /** True if the label was dispatched via TIP and that dispatch is DELIVERED. */
  dispatchDelivered?: boolean
  /** Pre-formatted delivery date string (e.g. "Apr 8, 2026"). */
  dispatchDeliveredAt?: string
  /** Receiver name from the linked dispatch, if any. */
  receiverName?: string
}

export function PendingShipmentReminderEmail({
  userName,
  shipmentName,
  trackingUrl,
  daysSinceReady,
  dispatchDelivered,
  dispatchDeliveredAt,
  receiverName,
}: PendingShipmentReminderEmailProps) {
  const elapsedPhrase =
    typeof daysSinceReady === 'number' && daysSinceReady > 0
      ? daysSinceReady === 1
        ? "It's been a day"
        : `It's been ${daysSinceReady} days`
      : "It's been a while"

  // Branch 1: we dispatched the labels and know they were delivered.
  // Branch 2: no dispatch record (user had labels already or imported them) —
  //   we only know the cargo shipment has been sitting pending.
  const hasKnownDispatch = Boolean(dispatchDelivered)

  const openingParagraph = hasKnownDispatch
    ? receiverName
      ? `${elapsedPhrase} since we delivered your labels to ${receiverName}${
          dispatchDeliveredAt ? ` on ${dispatchDeliveredAt}` : ''
        }, and "${shipmentName}" still hasn't sent its first location signal.`
      : `${elapsedPhrase} since your labels were delivered${
          dispatchDeliveredAt ? ` on ${dispatchDeliveredAt}` : ''
        }, and "${shipmentName}" still hasn't sent its first location signal.`
    : `${elapsedPhrase} since you created "${shipmentName}", and the label hasn't sent its first location signal yet.`

  return (
    <BaseLayout preview={`"${shipmentName}" hasn't reported in yet`}>
      <Heading style={heading}>Hi {userName},</Heading>

      <Text style={paragraph}>{openingParagraph}</Text>

      <Text style={paragraph}>
        <strong>That usually means one of three things:</strong>
      </Text>

      <Section style={reasonsList}>
        <Text style={reasonItem}>
          • <strong>The label is still wrapped up.</strong>{' '}
          {hasKnownDispatch && receiverName
            ? `${receiverName} needs to remove the pull tab and stick the label on the cargo — that's what gets it reporting.`
            : 'Whoever has the label needs to remove the pull tab and stick it on the cargo — that\u2019s what gets it reporting.'}
        </Text>
        <Text style={reasonItem}>
          • <strong>There&apos;s no cell coverage at the current location.</strong> The
          label will reconnect and start reporting on its own once signal is available.
        </Text>
        <Text style={reasonItem}>
          • <strong>The label was damaged in transit.</strong> If you&apos;ve confirmed
          it&apos;s been activated and attached to moving cargo, reply to this email and
          we&apos;ll look into it.
        </Text>
      </Section>

      <Text style={paragraph}>
        As soon as the first location comes in, we&apos;ll auto-switch this shipment to{' '}
        <strong>In Transit</strong> and ping you. Nothing else you need to do right now.
      </Text>

      <Section style={buttonContainer}>
        <Button style={button} href={trackingUrl}>
          View Shipment
        </Button>
      </Section>

      <Text style={footerNote}>
        This is the {typeof daysSinceReady === 'number' && daysSinceReady >= 14 ? 'final' : 'first'}{' '}
        reminder for this shipment. We won&apos;t keep nagging — you&apos;ll hear from us the
        moment the label reports in.
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

const reasonsList = {
  margin: '8px 0 24px',
  paddingLeft: '8px',
}

const reasonItem = {
  fontSize: '15px',
  lineHeight: '22px',
  color: '#475569',
  margin: '10px 0',
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

const footerNote = {
  fontSize: '13px',
  lineHeight: '20px',
  color: '#94a3b8',
  margin: '24px 0 0',
  fontStyle: 'italic' as const,
}

export default PendingShipmentReminderEmail
