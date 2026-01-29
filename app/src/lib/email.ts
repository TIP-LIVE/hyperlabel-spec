import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

export const resend = resendApiKey ? new Resend(resendApiKey) : null

// Default from address
export const FROM_EMAIL = process.env.FROM_EMAIL || 'HyperLabel <notifications@hyperlabel.io>'

// Check if email service is configured
export function isEmailConfigured(): boolean {
  return Boolean(resendApiKey && !resendApiKey.startsWith('re_REPLACE'))
}

// Email types for notification preferences
export type EmailType =
  | 'label_activated'
  | 'low_battery'
  | 'no_signal'
  | 'shipment_delivered'
  | 'order_shipped'

// Send email wrapper with error handling
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<{ success: boolean; error?: string }> {
  if (!resend || !isEmailConfigured()) {
    console.warn('Email service not configured, skipping email:', subject)
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Failed to send email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('Error sending email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
