import type { DecodeResult } from './types.ts';

const banglaDigits = '০১২৩৪৫৬৭৮৯';
export function toAsciiDigits(input: string): string {
  return input.replace(/[০-৯]/g, digit => String(banglaDigits.indexOf(digit)));
}
export function normalizeChassis(input: string): string {
  return toAsciiDigits(input).normalize('NFKC').trim().toUpperCase().replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, '');
}
export function chassisFormat(input: string):
  | { valid: true; kind: 'japanese' | 'vin'; normalized: string; code?: string }
  | { valid: false; reason: string } {
  const normalized = normalizeChassis(input);
  if (/^[A-Z0-9]{2,12}-[0-9]{4,8}$/.test(normalized)) {
    return { valid: true, kind: 'japanese', normalized, code: normalized.split('-')[0] };
  }
  if (/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) return { valid: true, kind: 'vin', normalized };
  return { valid: false, reason: 'Enter a Japanese code-serial frame number or a 17-character VIN (I, O and Q are not allowed).' };
}

// BRTA plate prefixes vary across districts. Validate structure without inventing a
// complete official area or vehicle-class register that CarBuy does not possess.
const classAliases: Record<string,string> = {
  GA: 'GA', গ: 'GA', KA: 'KA', ক: 'KA', KHA: 'KHA', খ: 'KHA',
  GHA: 'GHA', ঘ: 'GHA', CHA: 'CHA', চ: 'CHA', JA: 'JA', জ: 'JA',
  TA: 'TA', ট: 'TA', THA: 'THA', ঠ: 'THA', DA: 'DA', ড: 'DA',
  NA: 'NA', ন: 'NA', PA: 'PA', প: 'PA', BA: 'BA', ব: 'BA',
  MA: 'MA', ম: 'MA', SA: 'SA', স: 'SA', HA: 'HA', হ: 'HA',
};
export type RegistrationResult =
  | { valid: true; normalized: string; area: string; vehicleClass: string; series: string; serial: string }
  | { valid: false; reason: string };
export function validateBangladeshRegistration(input: string): RegistrationResult {
  const value = toAsciiDigits(input).normalize('NFKC').trim().replace(/[‐‑‒–—−]/g, '-').replace(/\s+/g, ' ');
  const match = /^([A-Za-z\u0980-\u09FF][A-Za-z\u0980-\u09FF ]{1,39})\s*-\s*([A-Za-z\u0980-\u09FF]{1,4})\s+([0-9]{2})\s*-\s*([0-9]{4})$/u.exec(value);
  if (!match) return { valid: false, reason: 'Use area-class series-serial, for example Dhaka Metro-Ga 11-1234.' };
  const [,areaRaw,classRaw,series,serial] = match;
  const vehicleClass = classAliases[classRaw.toUpperCase()];
  if (!vehicleClass) return { valid: false, reason: 'Vehicle class is not recognised; send the plate for manual review.' };
  const area = areaRaw.trim().replace(/\s+/g, ' ').toUpperCase();
  return { valid: true, normalized: `${area}-${vehicleClass}-${series}-${serial}`, area, vehicleClass, series, serial };
}

export type LiveListing = { id: string; chassisNumber: string; status: string };
export function duplicateLiveChassis(input: string, listings: readonly LiveListing[], excludeListingId?: string): LiveListing[] {
  const parsed = chassisFormat(input);
  if (!parsed.valid) return [];
  return listings.filter(listing => listing.id !== excludeListingId && listing.status === 'live'
    && normalizeChassis(listing.chassisNumber) === parsed.normalized);
}

export function invalidDecode(reason: string): DecodeResult { return { status: 'invalid', reason }; }
