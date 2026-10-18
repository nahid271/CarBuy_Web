import type { Body, Fuel, Transmission } from '../../vehicle-data/src/types.ts';

export type SellerType = 'private' | 'dealer';
export type Status = 'draft' | 'pending_payment' | 'pending_review' | 'live' | 'rejected' | 'sold' | 'withdrawn' | 'expired' | 'removed';
export type Condition = 'reconditioned' | 'used';
export type SoldVia = 'carbuy' | 'elsewhere' | 'showroom_trade_in' | 'didnt_sell';
export type Actor = { id: string; role: 'seller' | 'moderator' | 'system'; phoneVerified?: boolean; sellerType?: SellerType; dealerOrgId?: string };
export type ListingData = {
  makeId: string; modelId: string; generationId?: string; gradeId: string; gradeFreeText?: string;
  manufactureYear: number; registrationYear?: number; mileageKm: number; engineCc: number;
  fuel: Fuel; transmission: Transmission; body: Body; chassisNumber: string; condition: Condition;
  priceBdt: number; negotiable: boolean; district: string; area: string;
  colour?: string; registrationNumber?: string; taxTokenExpiry?: string; fitnessExpiry?: string;
  auctionGrade?: string; owners?: number; featureIds?: string[]; description?: string;
  stockNumber?: string; stockStatus?: 'ready' | 'preorder'; expectedArrival?: string; afterSalesNotes?: string;
};
export type ListingPhoto = { id: string; position: number; webpKey: string; avifKey: string; sha256: string; width: number; height: number; hints: string[] };
export type PaperType = 'registration' | 'smart_card' | 'tax_token' | 'fitness';
export type Paper = { id: string; type: PaperType; privateKey: string; uploadedAt: string; checkedAt?: string; checkedBy?: string };
export type AuctionSheet = { privateKey: string; displayKey: string; status: 'seller_provided_unverified' | 'verification_ordered' | 'verified'; grade?: string; mileageKm?: number };
export type Metrics = { impressions: number; views: number; chat: number; call: number; whatsapp: number; saves: number };
export type PriceChange = { priceBdt: number; at: string; actorId: string };
export type FeeOrder = { id: string; kind: 'initial' | 'renewal'; amountBdt: number; status: 'pending' | 'paid' | 'refund_pending' | 'refunded'; paymentReference?: string; checkoutUrl?: string; createdAt: string };
export type Vehicle = { id: string; chassisNormalized: string; listingIds: string[] };
export type Listing = {
  id: string; vehicleId?: string; sellerId: string; sellerType: SellerType; status: Status; version: number;
  data: Partial<ListingData>; photos: ListingPhoto[]; papers: Paper[]; auctionSheet?: AuctionSheet;
  papersChecked: boolean; metrics: Metrics; priceHistory: PriceChange[]; feeOrders: FeeOrder[];
  createdAt: string; updatedAt: string; submittedAt?: string; publishedAt?: string; expiresAt?: string;
  closedAt?: string; soldVia?: SoldVia; moderationNote?: string; reminderDaysSent: number[];
};
export type Audit = { listingId: string; actorId: string; action: string; at: string; details?: string };
export type State = { listings: Listing[]; vehicles: Vehicle[]; audit: Audit[] };
export type ListingStore = { read(): Promise<State>; transaction<T>(fn: (state: State) => T): Promise<T> };
export type Checkout = { url: string; reference: string };
export type BillingPort = {
  createCheckout(order: FeeOrder, listing: Listing): Promise<Checkout>;
  verifyPayment(order: FeeOrder, proof: string): Promise<boolean>;
  refund(order: FeeOrder): Promise<boolean>;
};
export type TranslationPort = { draft(data: ListingData, language: 'bn'|'en'): Promise<string>; translate(text: string, to: 'bn'|'en'): Promise<string> };
export type Reminder = { listingId: string; sellerId: string; daysRemaining: number; expiresAt: string };
