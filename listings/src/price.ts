import { toAsciiDigits } from '../../vehicle-data/src/validation.ts';

export function parseBdt(input: string): number | null {
  const value = toAsciiDigits(input).normalize('NFKC').trim().toLowerCase().replace(/^৳\s*/, '');
  const match = /^([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(lakh|lac|লাখ|crore|কোটি)?$/.exec(value);
  if (!match) return null;
  const amount = Number(match[1].replaceAll(',', ''));
  const multiplier = ['lakh', 'lac', 'লাখ'].includes(match[2] ?? '') ? 100_000
    : ['crore', 'কোটি'].includes(match[2] ?? '') ? 10_000_000 : 1;
  const taka = amount * multiplier;
  return Number.isSafeInteger(taka) && taka > 0 && taka <= 10_000_000_000 ? taka : null;
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
