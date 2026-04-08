/**
 * Modem QR code parser for SIMCom A7672E-style PCBs.
 *
 * Scanned QR text looks like:
 *   P/N:S2-109ZV-Z33R0;SN:MP06254801C7951;IMEI:864756085431395;SW:A011B27A7672M7
 *
 * We only persist IMEI (as Label.imei) and SW (as Label.firmwareVersion).
 * P/N and SN are extracted for logging but not stored. Note that SN here is
 * the SIMCom module serial number — NOT the SIM card ICCID, which comes from
 * Onomondo when the device first reports location.
 */

export interface ModemQrFields {
  /** 15-digit IMEI, validated. */
  imei: string
  /** Firmware version from SW: field. Null if absent. */
  firmwareVersion: string | null
  /** Board part number from P/N: field. Not persisted. */
  partNumber: string | null
  /** SIMCom module serial from SN: field. Not persisted (not the SIM ICCID). */
  serialNumber: string | null
}

export type ModemQrParseErrorCode = 'PARSE_FAILED' | 'MISSING_IMEI' | 'INVALID_IMEI'

export class ModemQrParseError extends Error {
  constructor(message: string, public code: ModemQrParseErrorCode) {
    super(message)
    this.name = 'ModemQrParseError'
  }
}

/**
 * Parse a modem QR string into structured fields.
 *
 * Tolerant to:
 * - Leading/trailing whitespace on the whole string and on each field
 * - Trailing `;` or empty segments
 * - Lowercase keys (`imei:` vs `IMEI:`)
 * - `PN` as an alias for `P/N`
 * - Unknown keys (ignored silently)
 * - Colons in values (splits each segment on the FIRST `:` only)
 *
 * Does NOT enforce IMEI Luhn checks — SIMCom test modems sometimes ship with
 * non-Luhn-valid IMEIs and we'd rather accept them than block the factory line.
 *
 * @throws {ModemQrParseError} with code:
 *   - `PARSE_FAILED` when the string has no `K:V` pairs at all
 *   - `MISSING_IMEI` when the pairs parse OK but no IMEI key is present
 *   - `INVALID_IMEI` when IMEI value isn't exactly 15 digits
 */
export function parseModemQr(text: string): ModemQrFields {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new ModemQrParseError('QR text is empty', 'PARSE_FAILED')
  }

  // Split on `;`, drop empty segments, parse each as K:V
  const segments = trimmed
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (segments.length === 0) {
    throw new ModemQrParseError('QR text contains no key/value pairs', 'PARSE_FAILED')
  }

  const fields = new Map<string, string>()
  let foundAnyPair = false
  for (const segment of segments) {
    const colonIdx = segment.indexOf(':')
    if (colonIdx === -1) continue // skip malformed segments
    const rawKey = segment.slice(0, colonIdx).trim().toLowerCase()
    const rawValue = segment.slice(colonIdx + 1).trim()
    if (!rawKey || !rawValue) continue
    foundAnyPair = true
    // Normalize "p/n" and "pn" to a single key
    const key = rawKey === 'pn' ? 'p/n' : rawKey
    fields.set(key, rawValue)
  }

  if (!foundAnyPair) {
    throw new ModemQrParseError('QR text contains no key/value pairs', 'PARSE_FAILED')
  }

  const imeiRaw = fields.get('imei')
  if (!imeiRaw) {
    throw new ModemQrParseError('QR is missing the IMEI field', 'MISSING_IMEI')
  }
  if (!/^\d{15}$/.test(imeiRaw)) {
    throw new ModemQrParseError(
      `IMEI must be exactly 15 digits, got "${imeiRaw}"`,
      'INVALID_IMEI'
    )
  }

  const swRaw = fields.get('sw')
  const firmwareVersion =
    swRaw && swRaw.length > 0 ? swRaw.slice(0, 64) : null

  return {
    imei: imeiRaw,
    firmwareVersion,
    partNumber: fields.get('p/n') ?? null,
    serialNumber: fields.get('sn') ?? null,
  }
}
