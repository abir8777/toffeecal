// Common country dial codes for the phone OTP selector.
// Sorted by popularity/region. Extend as needed.
export interface CountryCode {
  code: string;       // ISO 3166-1 alpha-2 (for flag)
  name: string;
  dial: string;       // Including leading +
  example: string;    // Local example (no country code)
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', name: 'India',           dial: '+91',  example: '98765 43210' },
  { code: 'US', name: 'United States',   dial: '+1',   example: '555 123 4567' },
  { code: 'GB', name: 'United Kingdom',  dial: '+44',  example: '7400 123456' },
  { code: 'CA', name: 'Canada',          dial: '+1',   example: '416 555 1234' },
  { code: 'AU', name: 'Australia',       dial: '+61',  example: '412 345 678' },
  { code: 'AE', name: 'UAE',             dial: '+971', example: '50 123 4567' },
  { code: 'SG', name: 'Singapore',       dial: '+65',  example: '8123 4567' },
  { code: 'DE', name: 'Germany',         dial: '+49',  example: '1512 3456789' },
  { code: 'FR', name: 'France',          dial: '+33',  example: '6 12 34 56 78' },
  { code: 'ES', name: 'Spain',           dial: '+34',  example: '612 34 56 78' },
  { code: 'IT', name: 'Italy',           dial: '+39',  example: '312 345 6789' },
  { code: 'NL', name: 'Netherlands',     dial: '+31',  example: '6 12345678' },
  { code: 'SE', name: 'Sweden',          dial: '+46',  example: '70 123 45 67' },
  { code: 'NO', name: 'Norway',          dial: '+47',  example: '406 12 345' },
  { code: 'DK', name: 'Denmark',         dial: '+45',  example: '20 12 34 56' },
  { code: 'IE', name: 'Ireland',         dial: '+353', example: '85 123 4567' },
  { code: 'CH', name: 'Switzerland',     dial: '+41',  example: '78 123 45 67' },
  { code: 'BE', name: 'Belgium',         dial: '+32',  example: '470 12 34 56' },
  { code: 'PT', name: 'Portugal',        dial: '+351', example: '912 345 678' },
  { code: 'BR', name: 'Brazil',          dial: '+55',  example: '11 91234 5678' },
  { code: 'MX', name: 'Mexico',          dial: '+52',  example: '55 1234 5678' },
  { code: 'AR', name: 'Argentina',       dial: '+54',  example: '11 1234 5678' },
  { code: 'JP', name: 'Japan',           dial: '+81',  example: '90 1234 5678' },
  { code: 'KR', name: 'South Korea',     dial: '+82',  example: '10 1234 5678' },
  { code: 'CN', name: 'China',           dial: '+86',  example: '131 2345 6789' },
  { code: 'HK', name: 'Hong Kong',       dial: '+852', example: '5123 4567' },
  { code: 'TW', name: 'Taiwan',          dial: '+886', example: '912 345 678' },
  { code: 'TH', name: 'Thailand',        dial: '+66',  example: '81 234 5678' },
  { code: 'VN', name: 'Vietnam',         dial: '+84',  example: '91 234 5678' },
  { code: 'PH', name: 'Philippines',     dial: '+63',  example: '917 123 4567' },
  { code: 'ID', name: 'Indonesia',       dial: '+62',  example: '812 3456 7890' },
  { code: 'MY', name: 'Malaysia',        dial: '+60',  example: '12 345 6789' },
  { code: 'PK', name: 'Pakistan',        dial: '+92',  example: '301 2345678' },
  { code: 'BD', name: 'Bangladesh',      dial: '+880', example: '1712 345678' },
  { code: 'LK', name: 'Sri Lanka',       dial: '+94',  example: '71 234 5678' },
  { code: 'NP', name: 'Nepal',           dial: '+977', example: '98 1234567' },
  { code: 'SA', name: 'Saudi Arabia',    dial: '+966', example: '50 123 4567' },
  { code: 'IL', name: 'Israel',          dial: '+972', example: '50 123 4567' },
  { code: 'TR', name: 'Turkey',          dial: '+90',  example: '501 234 56 78' },
  { code: 'EG', name: 'Egypt',           dial: '+20',  example: '100 123 4567' },
  { code: 'ZA', name: 'South Africa',    dial: '+27',  example: '71 123 4567' },
  { code: 'NG', name: 'Nigeria',         dial: '+234', example: '802 123 4567' },
  { code: 'KE', name: 'Kenya',           dial: '+254', example: '712 345678' },
  { code: 'RU', name: 'Russia',          dial: '+7',   example: '912 345 67 89' },
  { code: 'UA', name: 'Ukraine',         dial: '+380', example: '50 123 4567' },
  { code: 'PL', name: 'Poland',          dial: '+48',  example: '512 345 678' },
  { code: 'NZ', name: 'New Zealand',     dial: '+64',  example: '21 123 4567' },
];

// ISO country code → flag emoji
export function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/**
 * Build an E.164 phone number from a dial code + local number.
 * - Strips all non-digits from the local part
 * - Drops a single leading 0 (national trunk prefix used in many countries)
 * - Returns `+<digits>` with no spaces
 */
export function toE164(dial: string, local: string): string {
  let digits = local.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  const cc = dial.replace(/\D/g, '');
  return `+${cc}${digits}`;
}

/** Basic E.164 sanity check (8–15 digits after the +). */
export function isValidE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value);
}