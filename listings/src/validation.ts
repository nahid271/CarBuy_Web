import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import { chassisFormat, validateBangladeshRegistration } from '../../vehicle-data/src/validation.ts';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import type { Listing, ListingData, SoldVia } from './types.ts';

const requiredText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const validDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year,month,day] = match.slice(1).map(Number);
  const parsed = new Date(Date.UTC(year,month-1,day));
  return parsed.getUTCFullYear()===year && parsed.getUTCMonth()===month-1 && parsed.getUTCDate()===day;
};
export async function validateForSubmission(listing: Listing, catalog: CatalogService, now = new Date()): Promise<string[]> {
  const d = listing.data;
  const errors: string[] = [];
  const currentYear = now.getUTCFullYear();
  for (const field of ['makeId','modelId','gradeId','chassisNumber','district','area'] as const) if (!requiredText(d[field])) errors.push(`${field} is required`);
  if (d.gradeId === 'not-listed' && !requiredText(d.gradeFreeText)) errors.push('Enter the grade name');
  if (!Number.isInteger(d.manufactureYear) || d.manufactureYear! < 1950 || d.manufactureYear! > currentYear + 1) errors.push('Invalid manufacture year');
  if (!Number.isInteger(d.mileageKm) || d.mileageKm! < 0 || d.mileageKm! > 2_000_000) errors.push('Invalid mileage');
  if (!Number.isInteger(d.engineCc) || d.engineCc! < 1 || d.engineCc! > 20_000) errors.push('Invalid engine cc');
  if (!Number.isSafeInteger(d.priceBdt) || d.priceBdt! < 10_000 || d.priceBdt! > 10_000_000_000) errors.push('Invalid price');
  if (d.condition !== 'used' && d.condition !== 'reconditioned') errors.push('Choose Used or Reconditioned');
  if (d.condition === 'used' && (!Number.isInteger(d.registrationYear) || d.registrationYear! < d.manufactureYear! || d.registrationYear! > currentYear + 1)) errors.push('Used cars need a valid registration year');
  if (d.condition === 'reconditioned' && d.registrationYear != null) errors.push('Reconditioned cars must be unregistered');
  if (!d.fuel || !(d.fuel in fuelValues)) errors.push('Invalid fuel');
  if (!d.body || !(d.body in bodyValues)) errors.push('Invalid body');
  if (!d.transmission || !(d.transmission in transmissionValues)) errors.push('Invalid transmission');
  if (!requiredText(d.chassisNumber) || !chassisFormat(d.chassisNumber!).valid) errors.push('Invalid chassis number or VIN');
  if (d.registrationNumber && !validateBangladeshRegistration(d.registrationNumber).valid) errors.push('Invalid Bangladesh registration number');
  for (const [field, value] of [['taxTokenExpiry',d.taxTokenExpiry],['fitnessExpiry',d.fitnessExpiry]] as const) if (value && !validDate(value)) errors.push(`Invalid ${field}`);
  if (d.owners !== undefined && (!Number.isInteger(d.owners) || d.owners < 1 || d.owners > 20)) errors.push('Invalid owner count');
  if (d.description && (d.description.length > 5000 || !/[A-Za-z\u0980-\u09FF]/u.test(d.description))) errors.push('Description must be Bangla or English, up to 5,000 characters');
  if (listing.sellerType==='dealer') {
    if (!requiredText(d.stockNumber) || !/^[A-Za-z0-9_-]{1,32}$/.test(d.stockNumber!)) errors.push('Dealer stock number is required (letters, numbers, hyphen or underscore)');
    if (d.stockStatus!=='ready' && d.stockStatus!=='preorder') errors.push('Choose Ready or Pre-order stock status');
    if (d.stockStatus==='preorder' && (!d.expectedArrival || !validDate(d.expectedArrival))) errors.push('Pre-order requires expected arrival date');
    if (d.afterSalesNotes && d.afterSalesNotes.length>2000) errors.push('After-sales notes are too long');
  }
  if (!Array.isArray(listing.photos) || listing.photos.length < 4 || listing.photos.length > (listing.sellerType === 'dealer' ? 30 : 20)) errors.push('Add at least 4 photos within your seller limit');
  if (new Set(listing.photos.map(x => x.sha256)).size !== listing.photos.length) errors.push('Remove duplicate photos');
  const snapshot = await catalog.snapshot();
  const make = snapshot.makes.find(x => x.id === d.makeId && x.active);
  const model = snapshot.models.find(x => x.id === d.modelId && x.makeId === make?.id && x.active);
  const generation = d.generationId ? snapshot.generations.find(x => x.id === d.generationId && x.modelId === model?.id && x.active) : undefined;
  if (!make || !model) errors.push('Select a valid make and model');
  if (d.generationId && !generation) errors.push('Select a valid generation');
  if (d.gradeId !== 'not-listed' && !snapshot.grades.some(x => x.id === d.gradeId && x.generationId === generation?.id && x.active)) errors.push('Select a valid grade or Not listed');
  if (d.featureIds && (!Array.isArray(d.featureIds) || d.featureIds.some(id => !snapshot.features.some(x => x.id === id && x.active)))) errors.push('Invalid feature selection');
  return errors;
}

export const soldViaValues: readonly SoldVia[] = ['carbuy','elsewhere','showroom_trade_in','didnt_sell'];
export const editableFields = new Set<keyof ListingData>([
  'makeId','modelId','generationId','gradeId','gradeFreeText','manufactureYear','registrationYear','mileageKm','engineCc',
  'fuel','transmission','body','chassisNumber','condition','priceBdt','negotiable','district','area','colour',
  'registrationNumber','taxTokenExpiry','fitnessExpiry','auctionGrade','owners','featureIds','description',
  'stockNumber','stockStatus','expectedArrival','afterSalesNotes',
]);
export const materialFields = new Set<keyof ListingData>([
  'makeId','modelId','generationId','gradeId','gradeFreeText','manufactureYear','registrationYear','mileageKm',
  'engineCc','fuel','transmission','body','chassisNumber','condition','district','area','registrationNumber','stockStatus','expectedArrival',
]);
