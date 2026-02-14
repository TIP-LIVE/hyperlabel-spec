/**
 * Convert an ISO 3166-1 alpha-2 country code to a flag emoji.
 * Each ASCII letter maps to a Regional Indicator Symbol.
 * Example: "GB" → 🇬🇧, "US" → 🇺🇸
 */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  const upper = code.toUpperCase()
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}
