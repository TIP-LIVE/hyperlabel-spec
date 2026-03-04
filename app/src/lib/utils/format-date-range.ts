import { format, isSameDay, isSameYear } from 'date-fns'

/**
 * Format a date range concisely by omitting redundant parts.
 * Dates should be passed chronologically: older first, newer second.
 *
 * Same day:    "Mar 4, 2026, 8:28 AM — 2:30 PM"
 * Same year:   "Mar 1, 8:24 AM — Mar 4, 2026, 8:28 AM"
 * Diff year:   "Dec 30, 2025, 8:24 AM — Mar 4, 2026, 8:28 AM"
 */
export function formatDateRange(older: Date, newer: Date): string {
  const a = new Date(older)
  const b = new Date(newer)

  if (isSameDay(a, b)) {
    return `${format(a, 'MMM d, yyyy, h:mm a')} — ${format(b, 'h:mm a')}`
  }

  if (isSameYear(a, b)) {
    return `${format(a, 'MMM d, h:mm a')} — ${format(b, 'MMM d, yyyy, h:mm a')}`
  }

  return `${format(a, 'MMM d, yyyy, h:mm a')} — ${format(b, 'MMM d, yyyy, h:mm a')}`
}
