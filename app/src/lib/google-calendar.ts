import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar credentials not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)')
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

function getCalendar() {
  return google.calendar({ version: 'v3', auth: getAuth() })
}

export function isCalendarConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  )
}

interface CreateEventParams {
  summary: string
  description?: string
  startTime: string // ISO datetime
  endTime: string // ISO datetime
  timeZone?: string
  attendeeEmail?: string
}

const INTERVIEW_DESCRIPTION = `Thanks for agreeing to chat about cargo tracking!

What to expect:
• 45-60 minute conversation about your experience with shipment visibility
• A brief product concept review
• Confidential — nothing attributed to you by name
• £30 Amazon gift card as a thank you

This call will be recorded (with your permission) for note-taking accuracy.
Recordings are only accessible to the TIP research team and deleted within 90 days.

If you need to reschedule, just reply to this invite.

— Denys Chumak, TIP (tip.live)`

export function buildInterviewDescription(leadName: string): string {
  return `Interview with ${leadName}\n\n${INTERVIEW_DESCRIPTION}`
}

export async function createInterviewEvent({
  summary,
  description,
  startTime,
  endTime,
  timeZone = 'Europe/London',
  attendeeEmail,
}: CreateEventParams): Promise<{ eventId: string; htmlLink: string }> {
  const calendar = getCalendar()

  const event: calendar_v3.Schema$Event = {
    summary,
    description: description || INTERVIEW_DESCRIPTION,
    location: 'Zoom (link will be sent separately)',
    start: { dateTime: startTime, timeZone },
    end: { dateTime: endTime, timeZone },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 },
        { method: 'popup', minutes: 60 },
      ],
    },
    colorId: '9', // blueberry
  }

  if (attendeeEmail) {
    event.attendees = [{ email: attendeeEmail }]
  }

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: attendeeEmail ? 'all' : 'none',
  })

  return {
    eventId: res.data.id!,
    htmlLink: res.data.htmlLink!,
  }
}

export async function updateInterviewEvent(
  eventId: string,
  updates: {
    startTime?: string
    endTime?: string
    timeZone?: string
    summary?: string
    description?: string
  }
): Promise<void> {
  const calendar = getCalendar()

  const patch: calendar_v3.Schema$Event = {}
  if (updates.startTime) {
    patch.start = { dateTime: updates.startTime, timeZone: updates.timeZone || 'Europe/London' }
  }
  if (updates.endTime) {
    patch.end = { dateTime: updates.endTime, timeZone: updates.timeZone || 'Europe/London' }
  }
  if (updates.summary) patch.summary = updates.summary
  if (updates.description) patch.description = updates.description

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: patch,
    sendUpdates: 'all',
  })
}

export async function deleteInterviewEvent(eventId: string): Promise<void> {
  const calendar = getCalendar()

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'all',
  })
}

export async function listUpcomingEvents(maxResults = 20): Promise<calendar_v3.Schema$Event[]> {
  const calendar = getCalendar()

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    q: 'TIP User Research',
  })

  return res.data.items || []
}
