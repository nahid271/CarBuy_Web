export type Localized = { en: string; bn: string };
export type Fuel = 'petrol' | 'hybrid' | 'phev' | 'diesel' | 'cng' | 'petrol_cng' | 'lpg' | 'electric';
export type Body = 'sedan' | 'hatchback' | 'suv' | 'microbus' | 'wagon' | 'pickup' | 'coupe' | 'other';
export type Transmission = 'automatic' | 'cvt' | 'manual' | 'dct';
export type Drive = 'fwd' | 'rwd' | 'awd' | '4wd';
export type Specs = {
  body: Body;
  engineCc: number | null;
  fuel: Fuel;
  transmission: Transmission;
  drive: Drive;
  seats: number;
};
export type Make = { id: string; name: Localized; aliases: string[]; active: boolean };
export type Model = { id: string; makeId: string; name: Localized; aliases: string[]; active: boolean };
export type ChassisMapping = { code: string; sourceUrl: string; engineCode?: string };
export type Generation = {
  id: string;
  modelId: string;
  name: Localized;
  yearStart: number | null;
  yearEnd: number | null;
  chassis: ChassisMapping[];
  specs: Specs;
  active: boolean;
};
export type Grade = { id: string; generationId: string; name: Localized; active: boolean };
export type Feature = { id: string; name: Localized; group: string; active: boolean };
export type MappingRequest = {
  id: string;
  kind: 'make' | 'model' | 'generation' | 'grade' | 'chassis';
  submittedText: string;
  context: { makeId?: string; modelId?: string; generationId?: string };
  status: 'open' | 'mapped' | 'rejected';
  mappedTo?: string;
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
};
export type CatalogSnapshot = {
  version: number;
  makes: Make[];
  models: Model[];
  generations: Generation[];
  grades: Grade[];
  features: Feature[];
  mappingRequests: MappingRequest[];
};
export type CatalogStore = {
  load(): Promise<CatalogSnapshot>;
  save(snapshot: CatalogSnapshot, expectedVersion: number): Promise<void>;
};
// A licensed data partner can supply records without changing the public API.
// Its importer must map partner IDs and labels to CarBuy's stable IDs first.
export type LicensedCatalogProvider = {
  name: string;
  load(): Promise<Pick<CatalogSnapshot,'makes'|'models'|'generations'|'grades'|'features'>>;
};
export type AdminActor = { id: string; role: 'vehicle_catalog_admin' | 'other' };
export type DecodeCandidate = {
  make: Make;
  model: Model;
  generation: Generation;
  engineCc: number | null;
  engineCode?: string;
  grades: Grade[];
  evidenceUrl: string;
};
export type DecodeResult =
  | { status: 'invalid'; reason: string }
  | { status: 'vin'; normalized: string; candidates: []; gradeConfirmationRequired: true }
  | { status: 'unknown'; normalized: string; chassisCode: string; candidates: []; gradeConfirmationRequired: true }
  | { status: 'matched' | 'ambiguous'; normalized: string; chassisCode: string; candidates: DecodeCandidate[]; gradeConfirmationRequired: true };
