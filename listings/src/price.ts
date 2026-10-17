import { toAsciiDigits } from '../../vehicle-data/src/validation.ts';

export function parseBdt(input: string): number | null {
  const value = toAsciiDigits(input).normalize('NFKC').trim().toLowerCase().replace(/^৳\s*/, '');
  const match = /^([0-9][0-9,]*)(?:\.([0-9]{1,2}))?\s*(lakh|lac|লাখ|crore|কোটি)?$/.exec(value);
  if (!match) return null;
  const [, whole, fraction = '', unit = ''] = match;
  // Scale with decimal strings, not floats: 19.99 * 100000 is not an integer.
  const zeros = ['lakh', 'lac', 'লাখ'].includes(unit) ? 5 : ['crore', 'কোটি'].includes(unit) ? 7 : 0;
  const scaled = fraction.padEnd(zeros, '0');
  if (/[^0]/.test(scaled.slice(zeros))) return null;
  const digits = (whole.replaceAll(',', '') + scaled.slice(0, zeros)).replace(/^0+/, '');
  if (!digits || digits.length > 11) return null;
  const taka = Number(digits);
  return taka <= 10_000_000_000 ? taka : null;
}
export function formatBdt(amount: number, language: 'en'|'bn' = 'en'): string {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Invalid BDT amount');
  const digits = String(amount);
  const tail = digits.slice(-3);
  const leading = digits.slice(0, -3);
  const grouped = leading ? leading.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + tail : tail;
  const result = `৳${grouped}`;
  return language === 'bn' ? result.replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)]) : result;
}
export function lakhLabel(amount: number, language: 'en'|'bn' = 'en'): string {
  const count = amount / 100_000;
  const text = Number.isInteger(count) ? String(count) : count.toFixed(1).replace(/\.0$/, '');
  return language === 'bn' ? `${text.replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)])} লাখ` : `${text} lakh`;
}
