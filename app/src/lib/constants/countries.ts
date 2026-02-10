export const countries = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'AT', name: 'Austria' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'PL', name: 'Poland' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'CN', name: 'China' },
] as const

export type CountryCode = (typeof countries)[number]['code']

/** Look up country name by ISO code */
export function getCountryName(code: string): string {
  return countries.find((c) => c.code === code)?.name ?? code
}
