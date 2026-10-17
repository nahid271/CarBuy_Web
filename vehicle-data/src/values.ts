import type { Body, Drive, Fuel, Localized, Transmission } from './types.ts';

export const fuelValues: Record<Fuel, Localized> = {
  petrol: { en: 'Octane / Petrol', bn: 'অকটেন / পেট্রোল' },
  hybrid: { en: 'Hybrid', bn: 'হাইব্রিড' },
  phev: { en: 'Plug-in hybrid', bn: 'প্লাগ-ইন হাইব্রিড' },
  diesel: { en: 'Diesel', bn: 'ডিজেল' },
  cng: { en: 'CNG', bn: 'সিএনজি' },
  petrol_cng: { en: 'Octane + CNG', bn: 'অকটেন + সিএনজি' },
  lpg: { en: 'LPG', bn: 'এলপিজি' },
  electric: { en: 'Electric', bn: 'ইলেকট্রিক' },
};
export const bodyValues: Record<Body, Localized> = {
  sedan: { en: 'Sedan', bn: 'সেডান' }, hatchback: { en: 'Hatchback', bn: 'হ্যাচব্যাক' },
  suv: { en: 'SUV', bn: 'এসইউভি' }, microbus: { en: 'Microbus', bn: 'মাইক্রোবাস' },
  wagon: { en: 'Wagon', bn: 'ওয়াগন' }, pickup: { en: 'Pickup', bn: 'পিকআপ' },
  coupe: { en: 'Coupe', bn: 'কুপে' }, other: { en: 'Other', bn: 'অন্যান্য' },
};
export const transmissionValues: Record<Transmission, Localized> = {
  automatic: { en: 'Automatic', bn: 'অটোমেটিক' }, cvt: { en: 'CVT', bn: 'সিভিটি' },
  manual: { en: 'Manual', bn: 'ম্যানুয়াল' }, dct: { en: 'Dual-clutch', bn: 'ডুয়াল-ক্লাচ' },
};
export const driveValues: Record<Drive, Localized> = {
  fwd: { en: 'Front-wheel drive', bn: 'সামনের চাকা চালিত' },
  rwd: { en: 'Rear-wheel drive', bn: 'পেছনের চাকা চালিত' },
  awd: { en: 'All-wheel drive', bn: 'অল-হুইল ড্রাইভ' },
  '4wd': { en: 'Four-wheel drive', bn: 'ফোর-হুইল ড্রাইভ' },
};
export const engineCcBands = [
  { id: 'under_1000', min: 1, max: 1000, name: { en: 'Up to 1,000 cc', bn: '১,০০০ সিসি পর্যন্ত' } },
  { id: '1001_1300', min: 1001, max: 1300, name: { en: '1,001–1,300 cc', bn: '১,০০১–১,৩০০ সিসি' } },
  { id: '1301_1500', min: 1301, max: 1500, name: { en: '1,301–1,500 cc', bn: '১,৩০১–১,৫০০ সিসি' } },
  { id: '1501_1800', min: 1501, max: 1800, name: { en: '1,501–1,800 cc', bn: '১,৫০১–১,৮০০ সিসি' } },
  { id: '1801_2000', min: 1801, max: 2000, name: { en: '1,801–2,000 cc', bn: '১,৮০১–২,০০০ সিসি' } },
  { id: '2001_2500', min: 2001, max: 2500, name: { en: '2,001–2,500 cc', bn: '২,০০১–২,৫০০ সিসি' } },
  { id: '2501_3000', min: 2501, max: 3000, name: { en: '2,501–3,000 cc', bn: '২,৫০১–৩,০০০ সিসি' } },
  { id: 'over_3000', min: 3001, max: null, name: { en: 'Over 3,000 cc', bn: '৩,০০০ সিসির বেশি' } },
] as const;
export function engineBand(cc: number | null) {
  if (cc === null || !Number.isInteger(cc) || cc < 1) return null;
  return engineCcBands.find(x => cc >= x.min && (x.max === null || cc <= x.max)) ?? null;
}
