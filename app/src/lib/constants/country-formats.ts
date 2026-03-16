/** Country-specific placeholders and field labels for address forms */
export interface CountryFormat {
  name: string
  line1: string
  city: string
  state: string
  stateLabel: string
  postalCode: string
  postalCodeLabel: string
}

export const countryFormats: Record<string, CountryFormat> = {
  GB: { name: 'John Smith', line1: '10 Downing Street', city: 'London', state: 'Greater London', stateLabel: 'County (Optional)', postalCode: 'SW1A 1AA', postalCodeLabel: 'Postcode' },
  US: { name: 'John Doe', line1: '1600 Pennsylvania Ave', city: 'Washington', state: 'DC', stateLabel: 'State', postalCode: '20500', postalCodeLabel: 'ZIP Code' },
  DE: { name: 'Max Mustermann', line1: 'Friedrichstraße 43', city: 'Berlin', state: 'Berlin', stateLabel: 'Bundesland (Optional)', postalCode: '10117', postalCodeLabel: 'PLZ' },
  FR: { name: 'Jean Dupont', line1: '55 Rue du Faubourg', city: 'Paris', state: 'Île-de-France', stateLabel: 'Région (Optional)', postalCode: '75008', postalCodeLabel: 'Code postal' },
  NL: { name: 'Jan de Vries', line1: 'Keizersgracht 174', city: 'Amsterdam', state: 'Noord-Holland', stateLabel: 'Province (Optional)', postalCode: '1016 DW', postalCodeLabel: 'Postcode' },
  BE: { name: 'Jan Peeters', line1: 'Rue de la Loi 16', city: 'Brussels', state: 'Brussels', stateLabel: 'Province (Optional)', postalCode: '1000', postalCodeLabel: 'Postcode' },
  AT: { name: 'Anna Gruber', line1: 'Stephansplatz 1', city: 'Vienna', state: 'Vienna', stateLabel: 'Bundesland (Optional)', postalCode: '1010', postalCodeLabel: 'PLZ' },
  CH: { name: 'Hans Müller', line1: 'Bahnhofstrasse 1', city: 'Zurich', state: 'Zürich', stateLabel: 'Canton (Optional)', postalCode: '8001', postalCodeLabel: 'PLZ' },
  PL: { name: 'Jan Kowalski', line1: 'ul. Marszałkowska 1', city: 'Warsaw', state: 'Mazowieckie', stateLabel: 'Voivodeship (Optional)', postalCode: '00-001', postalCodeLabel: 'Kod pocztowy' },
  UA: { name: 'Іван Петренко', line1: 'вул. Хрещатик 1', city: 'Kyiv', state: 'Kyiv', stateLabel: 'Oblast (Optional)', postalCode: '01001', postalCodeLabel: 'Postal Code' },
  CN: { name: '张伟', line1: '长安街1号', city: 'Beijing', state: 'Beijing', stateLabel: 'Province', postalCode: '100000', postalCodeLabel: 'Postal Code' },
}

export const defaultCountryFormat: CountryFormat = {
  name: 'John Doe',
  line1: '123 Main Street',
  city: 'City',
  state: '',
  stateLabel: 'State / Province (Optional)',
  postalCode: '12345',
  postalCodeLabel: 'Postal Code',
}
