import { format } from 'date-fns'

/**
 * Standard date+time formatters for consistent display across the app.
 * Every user-facing date should include time so users can understand
 * when events happened.
 */

/** Compact date+time for tables, lists, metadata — "Mar 31, 2026, 10:31 AM" */
export function formatDateTime(date: Date | string | number): string {
  return format(new Date(date), 'PPp')
}

/** Full date+time for detail views, headers — "March 31, 2026, 10:31 AM" */
export function formatDateTimeFull(date: Date | string | number): string {
  return format(new Date(date), 'PPPp')
}
