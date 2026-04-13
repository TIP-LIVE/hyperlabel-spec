/**
 * Extract a label identifier from QR data. Supports three formats:
 *   - New 9-digit displayId (NNNNNYYYY), printed as tip.live/w/002011395
 *   - Legacy deviceId: TIP-001, TIP-123
 *   - Legacy deviceId: HL-001234
 * Input can be a bare ID, a full URL, or a url-ish string without a scheme.
 */
export function extractDeviceId(data: string): string | null {
  const trimmed = data.trim()
  if (!trimmed) return null

  // Bare identifiers (whole input is the ID).
  if (/^\d{9}$/.test(trimmed)) return trimmed
  const bareTip = trimmed.match(/^TIP-\d+$/i)
  if (bareTip) return bareTip[0].toUpperCase()
  const bareHl = trimmed.match(/^HL-\d{6}$/i)
  if (bareHl) return bareHl[0].toUpperCase()

  // URL-ish inputs: tip.live/w/002011395, https://tip.live/activate/TIP-001,
  // ?deviceId=TIP-001. new URL() requires a scheme, so add one if missing.
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withScheme)
    const pathDisplayId = url.pathname.match(/\/(?:w|activate)\/(\d{9})/i)
    if (pathDisplayId) return pathDisplayId[1]
    const pathTip = url.pathname.match(/TIP-\d+/i)
    if (pathTip) return pathTip[0].toUpperCase()
    const pathHl = url.pathname.match(/HL-\d{6}/i)
    if (pathHl) return pathHl[0].toUpperCase()
    const param = url.searchParams.get('deviceId')
    if (param) return param.trim().toUpperCase()
  } catch {
    // Not parseable as a URL — fall through to raw-text matching.
  }

  // Raw-text fallback for QR payloads that include surrounding copy.
  const anyTip = trimmed.match(/TIP-\d+/i)
  if (anyTip) return anyTip[0].toUpperCase()
  const anyHl = trimmed.match(/HL-\d{6}/i)
  if (anyHl) return anyHl[0].toUpperCase()

  return null
}
