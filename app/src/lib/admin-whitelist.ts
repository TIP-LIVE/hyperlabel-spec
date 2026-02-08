/**
 * Check if an email is in the admin whitelist.
 *
 * The ADMIN_EMAILS env var is a comma-separated list of email addresses
 * that should automatically receive the 'admin' role on sign-up or profile update.
 *
 * Example: ADMIN_EMAILS="alice@tip.live,bob@tip.live"
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS
  if (!adminEmails) return false

  const whitelist = adminEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

  return whitelist.includes(email.toLowerCase())
}
