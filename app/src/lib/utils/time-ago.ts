/**
 * Precise relative time formatter.
 * Replaces date-fns formatDistanceToNow which uses coarse buckets
 * (e.g. 32 min → "about 1 hour ago").
 */
export function timeAgo(date: Date | string | number): string {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffMs = now - then

  if (diffMs < 0) return 'just now'

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes === 1) return '1 minute ago'
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours === 1) {
    const remainMin = minutes - 60
    return remainMin > 0 ? `1 hr ${remainMin} min ago` : '1 hour ago'
  }
  if (hours < 24) return `${hours} hours ago`
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`

  return new Date(then).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
