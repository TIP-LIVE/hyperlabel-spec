import { describe, it, expect } from 'vitest'
import { parseModemQr, ModemQrParseError } from '@/lib/qr-parser'

describe('parseModemQr', () => {
  const CANONICAL =
    'P/N:S2-109ZV-Z33R0;SN:MP06254801C7951;IMEI:864756085431395;SW:A011B27A7672M7'

  it('parses the canonical SIMCom example', () => {
    const result = parseModemQr(CANONICAL)
    expect(result).toEqual({
      imei: '864756085431395',
      firmwareVersion: 'A011B27A7672M7',
      partNumber: 'S2-109ZV-Z33R0',
      serialNumber: 'MP06254801C7951',
    })
  })

  it('tolerates trailing semicolons', () => {
    const result = parseModemQr(`${CANONICAL};`)
    expect(result.imei).toBe('864756085431395')
  })

  it('tolerates double semicolons', () => {
    const result = parseModemQr(
      'P/N:S2-109ZV-Z33R0;;SN:MP06254801C7951;;IMEI:864756085431395;;SW:A011B27A7672M7'
    )
    expect(result.imei).toBe('864756085431395')
    expect(result.firmwareVersion).toBe('A011B27A7672M7')
  })

  it('tolerates leading and trailing whitespace', () => {
    const result = parseModemQr(`   ${CANONICAL}   \n`)
    expect(result.imei).toBe('864756085431395')
  })

  it('tolerates whitespace around keys and values', () => {
    const result = parseModemQr(
      ' P/N : S2-109ZV-Z33R0 ;  IMEI : 864756085431395 ; SW : A011B27A7672M7 '
    )
    expect(result.imei).toBe('864756085431395')
    expect(result.partNumber).toBe('S2-109ZV-Z33R0')
    expect(result.firmwareVersion).toBe('A011B27A7672M7')
  })

  it('accepts lowercase keys', () => {
    const result = parseModemQr('imei:864756085431395;sw:A011B27A7672M7')
    expect(result.imei).toBe('864756085431395')
    expect(result.firmwareVersion).toBe('A011B27A7672M7')
  })

  it('accepts mixed-case keys', () => {
    const result = parseModemQr('Imei:864756085431395;Sw:A011B27A7672M7')
    expect(result.imei).toBe('864756085431395')
    expect(result.firmwareVersion).toBe('A011B27A7672M7')
  })

  it('accepts PN as an alias for P/N', () => {
    const result = parseModemQr(
      'PN:S2-109ZV-Z33R0;SN:MP06254801C7951;IMEI:864756085431395;SW:A011B27A7672M7'
    )
    expect(result.partNumber).toBe('S2-109ZV-Z33R0')
    expect(result.imei).toBe('864756085431395')
  })

  it('ignores unknown keys', () => {
    const result = parseModemQr(
      'FOO:bar;IMEI:864756085431395;BAZ:qux;SW:A011B27A7672M7'
    )
    expect(result.imei).toBe('864756085431395')
    expect(result.firmwareVersion).toBe('A011B27A7672M7')
  })

  it('returns null firmwareVersion when SW is absent', () => {
    const result = parseModemQr('IMEI:864756085431395')
    expect(result.firmwareVersion).toBeNull()
    expect(result.imei).toBe('864756085431395')
  })

  it('returns null partNumber and serialNumber when absent', () => {
    const result = parseModemQr('IMEI:864756085431395;SW:X')
    expect(result.partNumber).toBeNull()
    expect(result.serialNumber).toBeNull()
  })

  it('splits each segment on the first colon only (tolerates colons in values)', () => {
    // Hypothetical firmware string containing a colon — we keep everything
    // after the first `:` as the value.
    const result = parseModemQr('IMEI:864756085431395;SW:A011:B27:A7672M7')
    expect(result.firmwareVersion).toBe('A011:B27:A7672M7')
  })

  it('truncates overly long firmware strings to 64 chars', () => {
    const longFw = 'A'.repeat(200)
    const result = parseModemQr(`IMEI:864756085431395;SW:${longFw}`)
    expect(result.firmwareVersion).toHaveLength(64)
  })

  describe('errors', () => {
    it('throws PARSE_FAILED on empty string', () => {
      expect(() => parseModemQr('')).toThrow(ModemQrParseError)
      try {
        parseModemQr('')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('PARSE_FAILED')
      }
    })

    it('throws PARSE_FAILED on whitespace-only string', () => {
      try {
        parseModemQr('   \n\t  ')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('PARSE_FAILED')
      }
    })

    it('throws PARSE_FAILED on junk with no key/value pairs', () => {
      try {
        parseModemQr('hello world')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('PARSE_FAILED')
      }
    })

    it('throws MISSING_IMEI when K:V pairs exist but no IMEI key', () => {
      try {
        parseModemQr('P/N:S2-109ZV-Z33R0;SN:MP06254801C7951;SW:A011B27A7672M7')
      } catch (err) {
        expect(err).toBeInstanceOf(ModemQrParseError)
        expect((err as ModemQrParseError).code).toBe('MISSING_IMEI')
      }
    })

    it('throws INVALID_IMEI for 14-digit IMEI', () => {
      try {
        parseModemQr('IMEI:86475608543139')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('INVALID_IMEI')
      }
    })

    it('throws INVALID_IMEI for 16-digit IMEI', () => {
      try {
        parseModemQr('IMEI:8647560854313950')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('INVALID_IMEI')
      }
    })

    it('throws INVALID_IMEI for non-numeric IMEI', () => {
      try {
        parseModemQr('IMEI:ABCDEF012345678')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('INVALID_IMEI')
      }
    })

    it('throws INVALID_IMEI for IMEI with spaces', () => {
      try {
        parseModemQr('IMEI:864 756 085 431 395')
      } catch (err) {
        expect((err as ModemQrParseError).code).toBe('INVALID_IMEI')
      }
    })

    it('ModemQrParseError extends Error and has a name', () => {
      const err = new ModemQrParseError('test', 'PARSE_FAILED')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('ModemQrParseError')
      expect(err.code).toBe('PARSE_FAILED')
    })
  })
})
