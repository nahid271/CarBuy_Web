import { randomUUID } from 'node:crypto';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { chassisFormat } from '../../vehicle-data/src/validation.ts';
import { editableFields, materialFields, validateForSubmission } from './validation.ts';
import type { Actor, BillingPort, FeeOrder, Listing, ListingData, ListingPhoto, ListingStore, Paper, Reminder, SoldVia, State, TranslationPort } from './types.ts';

const copy = <T>(value: T): T => structuredClone(value);
const active = new Set(['pending_payment','pending_review','live']);
const iso = (date: Date) => date.toISOString();
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
function sellerKey(actor:Actor) { return actor.sellerType==='dealer' && actor.dealerOrgId ? actor.dealerOrgId : actor.id; }
function owner(actor: Actor, listing: Listing) { if (actor.role !== 'seller' || sellerKey(actor) !== listing.sellerId) throw new Error('Listing owner required'); }
function moderator(actor: Actor) { if (actor.role !== 'moderator') throw new Error('Moderator required'); }
function system(actor: Actor) { if (actor.role !== 'system') throw new Error('Trusted system actor required'); }
function get(state: State, id: string): Listing { const listing = state.listings.find(x => x.id === id); if (!listing) throw new Error('Listing not found'); return listing; }
function audit(state: State, listing: Listing, actor: Actor, action: string, now: Date, details?: string) {
  state.audit.push({ listingId: listing.id, actorId: actor.id, action, at: iso(now), details });
}
function bump(listing: Listing, now: Date) { listing.version++; listing.updatedAt = iso(now); }
function requireVersion(listing: Listing, expected?: number) { if (expected !== undefined && listing.version !== expected) throw new Error('Draft changed on another device; refresh before saving'); }
function checkLimit(state: State, listing: Listing) {
  if (listing.sellerType !== 'private') return;
  const others = state.listings.filter(x => x.id !== listing.id && x.sellerId === listing.sellerId && active.has(x.status)).length;
  if (others >= 3) throw new Error('Private sellers can have at most 3 active cars; use a dealer account for more');
}
function checkChassis(state: State, listing: Listing) {
  const chassis = chassisFormat(listing.data.chassisNumber ?? '');
  if (!chassis.valid) throw new Error(chassis.reason);
  if (state.listings.some(x => x.id !== listing.id && x.status === 'live' && chassisFormat(x.data.chassisNumber ?? '').valid
    && (chassisFormat(x.data.chassisNumber ?? '') as {normalized:string}).normalized === chassis.normalized)) throw new Error('A live listing already uses this chassis number');
  return chassis.normalized;
}
export const sellSteps = ['chassis','confirm_vehicle','condition_papers','mileage_price','photos','description','location','preview','payment','review'] as const;

export class ListingService {
  private readonly store: ListingStore;
  private readonly catalog: CatalogService;
  private readonly billing: BillingPort;
  private readonly clock: () => Date;
  private readonly privateFeeBdt: number;
  private readonly translation?: TranslationPort;
  constructor(
    store: ListingStore,
    catalog: CatalogService,
    billing: BillingPort,
    clock: () => Date = () => new Date(),
    privateFeeBdt = 400,
    translation?: TranslationPort,
  ) { this.store=store;this.catalog=catalog;this.billing=billing;this.clock=clock;this.privateFeeBdt=privateFeeBdt;this.translation=translation; }
  async createDraft(actor: Actor): Promise<Listing> {
    if (actor.role !== 'seller' || !actor.phoneVerified || !actor.sellerType || (actor.sellerType==='dealer' && !actor.dealerOrgId)) throw new Error('Verified seller required');
    const now = this.clock();
    return this.store.transaction(state => {
      const listing: Listing = { id: randomUUID(), sellerId: sellerKey(actor), sellerType: actor.sellerType!, status: 'draft', version: 1,
        data: {}, photos: [], papers: [], papersChecked: false, metrics: { impressions: 0, views: 0, chat: 0, call: 0, whatsapp: 0, saves: 0 },
        priceHistory: [], feeOrders: [], createdAt: iso(now), updatedAt: iso(now), reminderDaysSent: [] };
      state.listings.push(listing); audit(state, listing, actor, 'draft_created', now); return listing;
    });
  }
  async getOwn(actor: Actor, id: string): Promise<Listing> { const listing = get(await this.store.read(), id); owner(actor, listing); return copy(listing); }
  async myListings(actor: Actor) {
    if (actor.role !== 'seller') throw new Error('Seller required');
    const now = this.clock().getTime();
    return (await this.store.read()).listings.filter(x => x.sellerId === sellerKey(actor)).map(x => ({
      id: x.id, status: x.status, version: x.version, priceBdt: x.data.priceBdt, modelId: x.data.modelId,
      impressions: x.metrics.impressions??0, views: x.metrics.views, contacts: { chat: x.metrics.chat, call: x.metrics.call, whatsapp: x.metrics.whatsapp },
      saves: x.metrics.saves, daysLive: x.publishedAt ? Math.max(0, Math.floor((Math.min(now, x.closedAt ? Date.parse(x.closedAt) : now) - Date.parse(x.publishedAt)) / 86_400_000)) : 0,
      expiresAt: x.expiresAt,
    }));
  }
  async saveDraft(actor: Actor, id: string, patch: Partial<ListingData>, expectedVersion?: number): Promise<Listing> {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !editableFields.has(key as keyof ListingData))) throw new Error('Invalid listing fields');
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing); requireVersion(listing, expectedVersion);
      if (!['draft','rejected'].includes(listing.status) && !(listing.status==='pending_review' && listing.publishedAt)) throw new Error('Listing cannot be autosaved in this status');
      listing.data = { ...listing.data, ...copy(patch) };
      if (listing.status === 'rejected') listing.status = 'draft';
      if (patch.priceBdt !== undefined && listing.priceHistory.at(-1)?.priceBdt !== patch.priceBdt)
        listing.priceHistory.push({ priceBdt: patch.priceBdt, at: iso(now), actorId: actor.id });
      bump(listing, now); audit(state, listing, actor, 'draft_saved', now); return listing;
    });
  }
  async addPhoto(actor: Actor, id: string, photo: ListingPhoto): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing);
      if (!['draft','rejected','live'].includes(listing.status)) throw new Error('Photos cannot be changed in this status');
      if (listing.photos.length >= (listing.sellerType === 'dealer' ? 30 : 20)) throw new Error('Photo limit reached');
      if (listing.photos.some(x => x.sha256 === photo.sha256)) throw new Error('Duplicate photo');
      listing.photos.push({ ...copy(photo), position: listing.photos.length });
      if (listing.status === 'live') listing.status = 'pending_review';
      bump(listing, now); audit(state, listing, actor, 'photo_added', now); return listing;
    });
  }
  async reorderPhotos(actor: Actor, id: string, orderedIds: string[]): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing);
      if (new Set(orderedIds).size !== listing.photos.length || !listing.photos.every(x => orderedIds.includes(x.id))) throw new Error('Include every photo exactly once');
      listing.photos.sort((a,b) => orderedIds.indexOf(a.id) - orderedIds.indexOf(b.id)).forEach((x,i) => { x.position=i; });
      bump(listing, now); return listing;
    });
  }
  async removePhoto(actor: Actor, id: string, photoId: string): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state,id); owner(actor,listing);
      if (!['draft','rejected','live'].includes(listing.status)) throw new Error('Photos cannot be changed in this status');
      const index = listing.photos.findIndex(x=>x.id===photoId);
      if (index<0) throw new Error('Photo not found');
      listing.photos.splice(index,1);listing.photos.forEach((x,i)=>{x.position=i;});
      if (listing.status==='live') listing.status='pending_review';
      bump(listing,now);audit(state,listing,actor,'photo_removed',now);return listing;
    });
  }
  async addPaper(actor: Actor, id: string, paper: Paper): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing);
      if (['sold','removed'].includes(listing.status)) throw new Error('Listing is closed');
      listing.papers.push(copy(paper)); listing.papersChecked = false;
      bump(listing, now); audit(state, listing, actor, 'paper_uploaded', now, paper.type); return listing;
    });
  }
  async setAuctionSheet(actor: Actor, id: string, privateKey: string, displayKey: string): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing);
      if (['sold','removed'].includes(listing.status)) throw new Error('Listing is closed');
      listing.auctionSheet = { privateKey, displayKey, status: 'seller_provided_unverified' };
      if (listing.status === 'live') listing.status = 'pending_review';
      bump(listing, now); audit(state, listing, actor, 'auction_sheet_uploaded', now); return listing;
    });
  }
  async verifyAuctionSheet(actor: Actor, id: string, grade: string, mileageKm: number): Promise<Listing> {
    moderator(actor); const now = this.clock();
    if (!grade.trim() || grade.length > 24 || !Number.isInteger(mileageKm) || mileageKm < 0 || mileageKm > 1_000_000)
      throw new Error('Valid auction grade and mileage required');
    return this.store.transaction(state => {
      const listing = get(state, id);
      if (!listing.auctionSheet) throw new Error('No auction sheet uploaded');
      listing.auctionSheet = { ...listing.auctionSheet, status: 'verified', grade: grade.trim(), mileageKm };
      bump(listing, now); audit(state, listing, actor, 'auction_sheet_verified', now, `Grade ${grade.trim()}, ${mileageKm} km`);
      return listing;
    });
  }
  async checkPapers(actor: Actor, id: string): Promise<Listing> {
    moderator(actor); const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id);
      if (!listing.papers.length) throw new Error('No papers uploaded');
      listing.papers.forEach(x => { x.checkedAt = iso(now); x.checkedBy = actor.id; });
      listing.papersChecked = true; bump(listing, now); audit(state, listing, actor, 'papers_checked', now); return listing;
    });
  }
  async beginSubmission(actor: Actor, id: string): Promise<{ listing: Listing; checkout: {url:string;reference:string} }> {
    const current = await this.getOwn(actor, id);
    const errors = await validateForSubmission(current, this.catalog, this.clock());
    if (errors.length) throw new Error(errors.join('; '));
    if (current.data.gradeId === 'not-listed') await this.catalog.submitUnknown('grade',current.data.gradeFreeText!,{
      makeId:current.data.makeId,modelId:current.data.modelId,generationId:current.data.generationId,
    });
    const decoded = await this.catalog.decode(current.data.chassisNumber!);
    if (decoded.status === 'unknown') await this.catalog.submitUnknown('chassis',decoded.chassisCode,{
      makeId:current.data.makeId,modelId:current.data.modelId,generationId:current.data.generationId,
    });
    const now = this.clock();
    const listing = await this.store.transaction(state => {
      const item = get(state, id); owner(actor, item); requireVersion(item, current.version);
      if (item.status !== 'draft') throw new Error('Only drafts can be submitted');
      checkLimit(state, item); checkChassis(state, item);
      // A seller correcting an already-paid material edit keeps the existing
      // term; a fresh fee is only due for a new listing or renewal.
      if (item.publishedAt && item.expiresAt && Date.parse(item.expiresAt) > now.getTime()) {
        item.status = 'pending_review'; item.submittedAt = iso(now); bump(item, now);
        audit(state, item, actor, 'paid_listing_resubmitted', now); return item;
      }
      const order: FeeOrder = { id: randomUUID(), kind: 'initial', amountBdt: item.sellerType === 'private' ? this.privateFeeBdt : 0,
        status: 'pending', createdAt: iso(now) };
      item.feeOrders.push(order); item.status = 'pending_payment'; bump(item, now);
      audit(state, item, actor, 'checkout_started', now); return item;
    });
    if (listing.status === 'pending_review') return { listing, checkout: { url: '', reference: '' } };
    const order = listing.feeOrders.at(-1)!;
    const checkout = await this.billing.createCheckout(order, listing);
    const updated = await this.store.transaction(state => {
      const item = get(state, id); const found = item.feeOrders.find(x => x.id === order.id)!;
      found.checkoutUrl = checkout.url; found.paymentReference = checkout.reference; bump(item, this.clock()); return item;
    });
    return { listing: updated, checkout };
  }
  async confirmPayment(id: string, orderId: string, proof: string): Promise<Listing> {
    const listing = get(await this.store.read(), id);
    const order = listing.feeOrders.find(x => x.id === orderId);
    if (!order || order.kind !== 'initial') throw new Error('Initial order not found');
    if (order.status === 'paid' && ['pending_review','live'].includes(listing.status)) return listing;
    if (order.status !== 'pending' || listing.status !== 'pending_payment') throw new Error('Order cannot be confirmed');
    if (!await this.billing.verifyPayment(order, proof)) throw new Error('Payment not verified');
    const now = this.clock();
    return this.store.transaction(state => {
      const item = get(state, id); const current = item.feeOrders.find(x => x.id === orderId);
      if (!current || current.status !== 'pending' || item.status !== 'pending_payment') throw new Error('Payment state changed');
      checkLimit(state, item); checkChassis(state, item);
      current.status = 'paid'; item.status = 'pending_review'; item.submittedAt = iso(now); bump(item, now);
      audit(state, item, {id:'payment_gateway',role:'system'}, 'listing_fee_paid', now, orderId); return item;
    });
  }
  async approve(actor: Actor, id: string): Promise<Listing> {
    moderator(actor); const now = this.clock();
    const candidate = get(await this.store.read(), id);
    const errors = await validateForSubmission(candidate, this.catalog, now);
    if (errors.length) throw new Error(errors.join('; '));
    return this.store.transaction(state => {
      const listing = get(state, id);
      if (listing.status !== 'pending_review') throw new Error('Listing is not pending review');
      requireVersion(listing, candidate.version);
      checkLimit(state, listing); const chassis = checkChassis(state, listing);
      let vehicle = state.vehicles.find(x => x.chassisNormalized === chassis);
      if (!vehicle) { vehicle = { id: randomUUID(), chassisNormalized: chassis, listingIds: [] }; state.vehicles.push(vehicle); }
      if (!vehicle.listingIds.includes(id)) vehicle.listingIds.push(id);
      listing.vehicleId = vehicle.id; listing.status = 'live';
      if (!listing.publishedAt) listing.publishedAt = iso(now);
      if (!listing.expiresAt || Date.parse(listing.expiresAt) <= now.getTime()) listing.expiresAt = iso(addDays(now, listing.sellerType === 'private' ? 60 : 30));
      listing.moderationNote = undefined; bump(listing, now); audit(state, listing, actor, 'listing_published', now); return listing;
    });
  }
  async reject(actor: Actor, id: string, note: string): Promise<Listing> {
    moderator(actor); const now = this.clock();
    const result = await this.store.transaction(state => {
      const listing = get(state, id); if (listing.status !== 'pending_review') throw new Error('Listing is not pending review');
      listing.status = 'rejected'; listing.moderationNote = note;
      const order = listing.feeOrders.at(-1); if (!listing.publishedAt && order?.status === 'paid') order.status = 'refund_pending';
      bump(listing, now); audit(state, listing, actor, 'listing_rejected', now, note); return listing;
    });
    return this.reconcileRefund(id, result);
  }
  private async reconcileRefund(id: string, listing: Listing): Promise<Listing> {
    const order = listing.feeOrders.at(-1);
    if (!order || order.status !== 'refund_pending' || !await this.billing.refund(order)) return listing;
    return this.store.transaction(state => {
      const item = get(state, id); const current = item.feeOrders.find(x => x.id === order.id);
      if (current?.status === 'refund_pending') current.status = 'refunded';
      bump(item, this.clock()); return item;
    });
  }
  async retryRefund(actor: Actor, id: string): Promise<Listing> { moderator(actor); return this.reconcileRefund(id, get(await this.store.read(), id)); }
  async editLive(actor: Actor, id: string, patch: Partial<ListingData>): Promise<Listing> {
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Object.keys(patch).some(key => !editableFields.has(key as keyof ListingData))) throw new Error('Invalid listing fields');
    const now = this.clock();
    const current = await this.getOwn(actor,id);
    const candidate = { ...current, data: { ...current.data, ...patch } };
    const material = Object.entries(patch).some(([key,value]) => materialFields.has(key as keyof ListingData) && JSON.stringify(current.data[key as keyof ListingData]) !== JSON.stringify(value));
    if (!material) {
      const errors = await validateForSubmission(candidate,this.catalog,now);
      if (errors.length) throw new Error(errors.join('; '));
    }
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing); requireVersion(listing,current.version); if (listing.status !== 'live') throw new Error('Listing is not live');
      const previousPrice = listing.data.priceBdt;
      listing.data = { ...listing.data, ...copy(patch) };
      if (patch.priceBdt !== undefined && patch.priceBdt !== previousPrice) {
        if (!Number.isSafeInteger(patch.priceBdt) || patch.priceBdt < 10_000) throw new Error('Invalid price');
        listing.priceHistory.push({ priceBdt: patch.priceBdt, at: iso(now), actorId: actor.id });
      }
      if (material) listing.status = 'pending_review';
      bump(listing, now); audit(state, listing, actor, material ? 'material_edit_review' : 'live_edited', now); return listing;
    });
  }
  async markSold(actor: Actor, id: string, soldVia: SoldVia): Promise<Listing> {
    if (!['carbuy','elsewhere','showroom_trade_in','didnt_sell'].includes(soldVia)) throw new Error('Choose where it sold');
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing); if (listing.status !== 'live') throw new Error('Only live cars can be marked sold');
      listing.status = 'sold'; listing.soldVia = soldVia; listing.closedAt = iso(now); bump(listing, now);
      audit(state, listing, actor, 'listing_marked_sold', now, soldVia); return listing;
    });
  }
  async relistSold(actor: Actor, id: string): Promise<Listing> {
    const now=this.clock();
    return this.store.transaction(state=>{
      const previous=get(state,id);owner(actor,previous);
      if(previous.status!=='sold'||!previous.vehicleId) throw new Error('Only a sold listing can be relisted');
      const next:Listing={id:randomUUID(),vehicleId:previous.vehicleId,sellerId:previous.sellerId,sellerType:previous.sellerType,status:'draft',version:1,
        data:copy(previous.data),photos:previous.photos.map(x=>({...copy(x),id:randomUUID()})),papers:[],papersChecked:false,auctionSheet:undefined,
        metrics:{impressions:0,views:0,chat:0,call:0,whatsapp:0,saves:0},priceHistory:[],feeOrders:[],createdAt:iso(now),updatedAt:iso(now),reminderDaysSent:[]};
      state.listings.push(next);
      state.vehicles.find(x=>x.id===previous.vehicleId)!.listingIds.push(next.id);
      audit(state,next,actor,'sold_vehicle_relisted',now,previous.id);return next;
    });
  }
  async vehicleHistory(actor:Actor,id:string) {
    const state=await this.store.read();const listing=get(state,id);owner(actor,listing);
    if(!listing.vehicleId)return [];
    return state.listings.filter(x=>x.vehicleId===listing.vehicleId).flatMap(x=>x.priceHistory.map(p=>({listingId:x.id,...p}))).sort((a,b)=>a.at.localeCompare(b.at));
  }
  async withdraw(actor: Actor, id: string): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing); if (listing.status !== 'live') throw new Error('Only live listings can be withdrawn');
      listing.status = 'withdrawn'; listing.closedAt = iso(now); bump(listing, now); audit(state, listing, actor, 'listing_withdrawn', now); return listing;
    });
  }
  async remove(actor:Actor,id:string,note:string):Promise<Listing> {
    moderator(actor);const now=this.clock();
    return this.store.transaction(state=>{
      const listing=get(state,id);
      if(['sold','removed'].includes(listing.status)) throw new Error('Listing is already closed');
      listing.status='removed';listing.closedAt=iso(now);listing.moderationNote=note;
      bump(listing,now);audit(state,listing,actor,'listing_removed',now,note);return listing;
    });
  }
  async relistWithdrawn(actor: Actor, id: string): Promise<Listing> {
    const now = this.clock();
    return this.store.transaction(state => {
      const listing = get(state, id); owner(actor, listing);
      if (listing.status !== 'withdrawn' || !listing.closedAt || now.getTime() - Date.parse(listing.closedAt) > 30 * 86_400_000 || !listing.expiresAt || Date.parse(listing.expiresAt) <= now.getTime()) throw new Error('Renewal payment is required');
      checkLimit(state, listing); checkChassis(state, listing);
      listing.status = 'live'; listing.closedAt = undefined; bump(listing, now); audit(state, listing, actor, 'listing_relisted', now); return listing;
    });
  }
  async beginRenewal(actor: Actor, id: string): Promise<{listing:Listing;checkout:{url:string;reference:string}}> {
    const now = this.clock();
    const listing = await this.store.transaction(state => {
      const item = get(state, id); owner(actor, item);
      if (item.status !== 'expired' && item.status !== 'withdrawn') throw new Error('Only expired or withdrawn listings need renewal');
      checkLimit(state, item); checkChassis(state, item);
      item.feeOrders.push({id:randomUUID(),kind:'renewal',amountBdt:item.sellerType === 'private' ? this.privateFeeBdt : 0,status:'pending',createdAt:iso(now)});
      item.status='pending_payment'; bump(item,now); audit(state,item,actor,'renewal_started',now); return item;
    });
    const order=listing.feeOrders.at(-1)!; const checkout=await this.billing.createCheckout(order,listing);
    const updated=await this.store.transaction(state=>{const item=get(state,id);const current=item.feeOrders.find(x=>x.id===order.id)!;current.checkoutUrl=checkout.url;current.paymentReference=checkout.reference;bump(item,this.clock());return item;});
    return {listing:updated,checkout};
  }
  async confirmRenewal(id:string,orderId:string,proof:string):Promise<Listing> {
    const listing=get(await this.store.read(),id);const order=listing.feeOrders.find(x=>x.id===orderId);
    if(order?.kind==='renewal' && order.status==='paid' && listing.status==='live') return listing;
    if(!order || order.kind!=='renewal' || order.status!=='pending' || listing.status!=='pending_payment') throw new Error('Renewal order not pending');
    if(!await this.billing.verifyPayment(order,proof)) throw new Error('Payment not verified');
    const now=this.clock();
    return this.store.transaction(state=>{
      const item=get(state,id);const current=item.feeOrders.find(x=>x.id===orderId);
      if(!current || current.status!=='pending' || item.status!=='pending_payment') throw new Error('Payment state changed');
      checkLimit(state,item);checkChassis(state,item);current.status='paid';item.status='live';item.expiresAt=iso(addDays(now,item.sellerType==='private'?60:30));item.closedAt=undefined;item.reminderDaysSent=[];
      bump(item,now);audit(state,item,{id:'payment_gateway',role:'system'},'listing_renewed',now);return item;
    });
  }
  async expireAndRemind(actor:Actor):Promise<Reminder[]> {
    system(actor);const now=this.clock();
    return this.store.transaction(state=>{
      const reminders:Reminder[]=[];
      for(const listing of state.listings.filter(x=>x.status==='live' && x.expiresAt)) {
        const ms=Date.parse(listing.expiresAt!)-now.getTime();
        if(ms<=0) {listing.status='expired';listing.closedAt=iso(now);bump(listing,now);audit(state,listing,actor,'listing_expired',now);continue;}
        const days=Math.ceil(ms/86_400_000);
        if([7,1].includes(days) && !listing.reminderDaysSent.includes(days)) {listing.reminderDaysSent.push(days);reminders.push({listingId:listing.id,sellerId:listing.sellerId,daysRemaining:days,expiresAt:listing.expiresAt!});}
      }
      return reminders;
    });
  }
  async recordEngagement(actor:Actor,id:string,kind:keyof Listing['metrics']):Promise<void> {
    system(actor);if(!['impressions','views','chat','call','whatsapp','saves'].includes(kind)) throw new Error('Invalid metric');
    await this.store.transaction(state=>{get(state,id).metrics[kind]++;});
  }
  async priceGuidance(makeId:string,modelId:string,year:number):Promise<{medianBdt:number;sampleSize:number;lowBdt:number;highBdt:number}|null> {
    const prices=(await this.store.read()).listings.filter(x=>x.status==='live'&&x.data.makeId===makeId&&x.data.modelId===modelId&&Math.abs((x.data.manufactureYear??0)-year)<=2&&x.data.priceBdt).map(x=>x.data.priceBdt!).sort((a,b)=>a-b);
    if(prices.length<5)return null;
    const mid=Math.floor(prices.length/2);
    return {medianBdt:prices.length%2?prices[mid]:Math.round((prices[mid-1]+prices[mid])/2),sampleSize:prices.length,lowBdt:prices[0],highBdt:prices.at(-1)!};
  }
  async draftDescription(actor:Actor,id:string,language:'bn'|'en'):Promise<string> {
    const listing=await this.getOwn(actor,id); const data=listing.data as ListingData;
    if(!data.makeId||!data.modelId||!data.manufactureYear) throw new Error('Enter vehicle details first');
    if(this.translation)return this.translation.draft(data,language);
    return language==='bn' ? `${data.manufactureYear} সালের ${data.makeId} ${data.modelId}। মাইলেজ ${data.mileageKm??'—'} কিমি। গাড়ির অবস্থা ও কাগজপত্র দেখে সিদ্ধান্ত নিন।`
      : `${data.manufactureYear} ${data.makeId} ${data.modelId}. Mileage: ${data.mileageKm??'—'} km. Please inspect the car and documents before buying.`;
  }
  async translateDescription(text:string,to:'bn'|'en'):Promise<string> { if(!this.translation) throw new Error('Translation provider is not configured');return this.translation.translate(text,to); }
  shareLinks(id:string,baseUrl:string):{copy:string;whatsapp:string;facebook:string;messenger:string} {
    const url=new URL(`/cars/${encodeURIComponent(id)}`,baseUrl).toString();
    return {copy:url,whatsapp:`https://wa.me/?text=${encodeURIComponent(url)}`,facebook:`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,messenger:`fb-messenger://share?link=${encodeURIComponent(url)}`};
  }
}
