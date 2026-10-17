export type DealerRole = 'owner' | 'manager' | 'sales';
export type DealerActor = { id: string; role: 'dealer_user' | 'moderator' | 'system'; phoneVerified?: boolean };
export type BuyerActor = { id: string; role: 'buyer'; phoneVerified?: boolean };
export type ContactReveal = { channel: 'call' | 'whatsapp'; phone: string; href: string };
export type Member = { userId: string; role: DealerRole; name: string; phone: string; email?: string; pushToken?: string;
  pushEnabled: boolean; smsOptIn: boolean; emailOptIn: boolean; active: boolean };
export type ApplicationInput = {
  showroomName: string; tradeLicenceNumber: string; tin: string; ownerNid: string;
  address: string; district: string; phones: string[]; whatsapp: string; logoKey: string;
  barvidaMembership?: string; hours: string; about?: string;
};
export type Application = Omit<ApplicationInput,'ownerNid'> & {
  id: string; applicantUserId: string; ownerNidCiphertext: string; status: 'pending' | 'verified' | 'rejected';
  createdAt: string; reviewedAt?: string; reviewerId?: string; reviewMethod?: 'visit' | 'video_call'; reviewNote?: string; orgId?: string;
};
export type DealerOrg = {
  id: string; slug: string; name: string; address: string; district: string; phones: string[]; whatsapp: string;
  logoKey: string; hours: string; about: string; verifiedAt: string; verificationMethod: 'visit' | 'video_call';
  members: Member[]; autoRenew: boolean; starterGrantedAt?: string; createdAt: string;
};
export type LedgerEntry = { id: string; orgId: string; delta: number; reason: 'starter' | 'pack' | 'listing' | 'renewal' | 'refund' | 'admin';
  reference: string; listingId?: string; createdAt: string };
export type CreditPack = { id: string; credits: number; priceBdt: number; label: string };
export type Purchase = { id: string; orgId: string; packId: string; credits: number; amountBdt: number;
  method: 'bkash' | 'nagad' | 'card'; status: 'pending' | 'paid'; gatewayReference?: string; checkoutUrl?: string; createdAt: string };
export type Lead = { id: string; orgId: string; listingId: string; buyerId: string; channel: 'chat' | 'call' | 'whatsapp';
  events: Array<{channel:'chat'|'call'|'whatsapp';at:string}>;
  status: 'new' | 'contacted' | 'qualified' | 'closed'; assigneeId?: string; notes: string; createdAt: string; updatedAt: string };
export type Notification = { id: string; orgId: string; userId: string; kind: 'lead' | 'low_credit'; channel: 'push' | 'sms' | 'email';
  body: string; status: 'queued' | 'sent' | 'failed'; createdAt: string };
export type DealerAudit = { id: string; orgId?: string; applicationId?: string; actorId: string; action: string; detail?: string; createdAt: string };
export type DealerState = { applications: Application[]; orgs: DealerOrg[]; ledger: LedgerEntry[]; purchases: Purchase[]; leads: Lead[]; notifications: Notification[]; audit: DealerAudit[] };
export type DealerStore = { read(): Promise<DealerState>; transaction<T>(fn: (state: DealerState) => T): Promise<T> };
export type PaymentGateway = {
  createCheckout(purchase: Purchase): Promise<{url:string;reference:string}>;
  verifyPayment(purchase: Purchase, proof: string): Promise<boolean>;
};
export type NotificationPort = { push(userId:string, token:string, body:string):Promise<void>; sms(phone:string, body:string):Promise<void>; email(address:string, body:string):Promise<void> };
export type DealerConfig = { starterCredits: number; foundingStart: string; foundingEnd: string; lowCreditThreshold: number; packs: CreditPack[] };
