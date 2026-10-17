import { randomUUID } from 'node:crypto';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import type { Actor as ListingActor, ListingData, Listing, SoldVia } from '../../listings/src/types.ts';
import { feeCovered, ListingService } from '../../listings/src/service.ts';
import { soldViaValues } from '../../listings/src/validation.ts';
import { LocalMediaStore, preparePhoto } from '../../listings/src/media.ts';
import { balance, DealerCreditBillingPort } from './credits.ts';
import { parseBulkFile, stockFromPhotoName, validateBulkRows, csvRows, type BulkReport } from './bulk.ts';
import type { Application, ApplicationInput, BuyerActor, ContactReveal, CreditPack, DealerActor, DealerConfig, DealerOrg, DealerRole, DealerState, DealerStore, Lead, Member, Notification, NotificationPort, PaymentGateway, Purchase } from './types.ts';
import { NidVault } from './vault.ts';

const nowIso = (clock:()=>Date) => clock().toISOString();
const copy = <T>(value:T):T => structuredClone(value);
const numberAscii = (value:string) => value.replace(/[০-৯]/g,d=>String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
const cleanPhone = (value:string) => {const raw=numberAscii(value).replace(/[\s()-]/g,'');const phone=raw.startsWith('0')?'+88'+raw:raw;
  if(!/^\+8801\d{9}$/.test(phone))throw new Error('Enter a Bangladesh mobile number');return phone};
const required = (value:unknown,label:string,max=120) => {if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw new Error(`${label} is required (up to ${max} characters)`);return value.trim()};
const slugify=(value:string)=>value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50)||'dealer';
function getOrg(state:DealerState,id:string):DealerOrg {const org=state.orgs.find(x=>x.id===id);if(!org)throw new Error('Verified dealer not found');return org}
function getApplication(state:DealerState,id:string):Application {const app=state.applications.find(x=>x.id===id);if(!app)throw new Error('Application not found');return app}
function member(actor:DealerActor,org:DealerOrg,roles:DealerRole[]=['owner','manager','sales']):Member {
  if(actor.role!=='dealer_user'||!actor.phoneVerified)throw new Error('Verified dealer staff required');
  const person=org.members.find(x=>x.userId===actor.id&&x.active);
  if(!person||!roles.includes(person.role))throw new Error('Dealer role does not allow this action');
  return person;
}
function moderator(actor:DealerActor){if(actor.role!=='moderator')throw new Error('Moderator required')}
function system(actor:DealerActor){if(actor.role!=='system')throw new Error('Trusted system required')}
function log(state:DealerState,actorId:string,action:string,orgId?:string,applicationId?:string,detail?:string){
  state.audit.push({id:randomUUID(),actorId,action,orgId,applicationId,detail,createdAt:new Date().toISOString()});
}
export const demoDealerConfig:DealerConfig={
  starterCredits:5,foundingStart:'2026-01-01',foundingEnd:'2026-12-31',lowCreditThreshold:2,
  packs:[{id:'five',credits:5,priceBdt:2000,label:'5 credits'},{id:'ten',credits:10,priceBdt:3600,label:'10 credits'},{id:'twentyfive',credits:25,priceBdt:8000,label:'25 credits'}],
};

export class DealerService {
  private readonly store:DealerStore;private readonly listings:ListingService;private readonly catalog:CatalogService;
  private readonly vault:NidVault;private readonly media:LocalMediaStore;private readonly payments:PaymentGateway;
  private readonly notifications:NotificationPort;private readonly config:DealerConfig;private readonly clock:()=>Date;
  private readonly creditBilling:DealerCreditBillingPort;
  constructor(args:{store:DealerStore;listings:ListingService;catalog:CatalogService;vault:NidVault;media:LocalMediaStore;
    payments:PaymentGateway;notifications:NotificationPort;config?:DealerConfig;clock?:()=>Date;creditBilling:DealerCreditBillingPort}){
    this.store=args.store;this.listings=args.listings;this.catalog=args.catalog;this.vault=args.vault;this.media=args.media;
    this.payments=args.payments;this.notifications=args.notifications;this.config=args.config??demoDealerConfig;this.clock=args.clock??(()=>new Date());this.creditBilling=args.creditBilling;
  }
  private listingActor(actor:DealerActor,org:DealerOrg):ListingActor {member(actor,org);return {id:actor.id,role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:org.id}}
  private syntheticActor(org:DealerOrg):ListingActor {return {id:'dealer-service',role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:org.id}}
  async apply(actor:DealerActor,input:ApplicationInput):Promise<Omit<Application,'ownerNidCiphertext'>>{
    if(actor.role!=='dealer_user'||!actor.phoneVerified)throw new Error('Verified mobile required to apply');
    const showroomName=required(input.showroomName,'Showroom name',100);
    const tradeLicenceNumber=required(input.tradeLicenceNumber,'Trade licence',60);
    const tin=numberAscii(required(input.tin,'TIN',20));if(!/^\d{9,15}$/.test(tin))throw new Error('TIN must contain 9–15 digits');
    const ownerNid=numberAscii(required(input.ownerNid,'Owner NID',20));if(!/^\d{10,17}$/.test(ownerNid))throw new Error('Owner NID must contain 10–17 digits');
    const address=required(input.address,'Address',250);const district=required(input.district,'District',80);
    if(!Array.isArray(input.phones)||!input.phones.length||input.phones.length>3)throw new Error('Provide 1–3 showroom phones');
    const phones=input.phones.map(cleanPhone);const whatsapp=cleanPhone(input.whatsapp);
    const logoKey=required(input.logoKey,'Logo',100);const hours=required(input.hours,'Opening hours',100);
    const barvidaMembership=input.barvidaMembership?.trim();const about=input.about?.trim()??'';
    if(about.length>2000)throw new Error('About text is too long');
    const at=nowIso(this.clock);
    return this.store.transaction(state=>{
      if(state.applications.some(x=>x.tradeLicenceNumber.toLowerCase()===tradeLicenceNumber.toLowerCase()&&x.status!=='rejected'))throw new Error('Trade licence already has an application');
      if(state.applications.some(x=>x.applicantUserId===actor.id&&x.status==='pending'))throw new Error('An application is already pending');
      const app:Application={id:randomUUID(),applicantUserId:actor.id,showroomName,tradeLicenceNumber,tin,ownerNidCiphertext:this.vault.encrypt(ownerNid),
        address,district,phones,whatsapp,logoKey,barvidaMembership,hours,about,status:'pending',createdAt:at};
      state.applications.push(app);log(state,actor.id,'dealer_application_submitted',undefined,app.id);
      const {ownerNidCiphertext:_,...safe}=app;return safe;
    });
  }
  async myApplications(actor:DealerActor){if(actor.role!=='dealer_user')throw new Error('Dealer user required');
    return (await this.store.read()).applications.filter(x=>x.applicantUserId===actor.id).map(({ownerNidCiphertext:_,...safe})=>safe)}
  async reviewSensitive(actor:DealerActor,applicationId:string){moderator(actor);const app=getApplication(await this.store.read(),applicationId);
    return {...app,ownerNid:this.vault.decrypt(app.ownerNidCiphertext),ownerNidCiphertext:undefined}}
  async reviewApplication(actor:DealerActor,id:string,decision:'verify'|'reject',method:'visit'|'video_call',note:string):Promise<DealerOrg|null>{
    moderator(actor);if(!['visit','video_call'].includes(method))throw new Error('Choose visit or video call');
    note=required(note,'Review note',1000);
    const at=nowIso(this.clock);return this.store.transaction(state=>{
      const app=getApplication(state,id);if(app.status!=='pending')throw new Error('Application already reviewed');
      app.status=decision==='verify'?'verified':'rejected';app.reviewedAt=at;app.reviewerId=actor.id;app.reviewMethod=method;app.reviewNote=note.trim();
      if(decision==='reject'){log(state,actor.id,'dealer_application_rejected',undefined,id,note);return null}
      const base=slugify(app.showroomName);let slug=base;let suffix=2;while(state.orgs.some(x=>x.slug===slug))slug=`${base}-${suffix++}`;
      const org:DealerOrg={id:randomUUID(),slug,name:app.showroomName,address:app.address,district:app.district,phones:app.phones,
        whatsapp:app.whatsapp,logoKey:app.logoKey,hours:app.hours,about:app.about??'',verifiedAt:at,verificationMethod:method,
        members:[{userId:app.applicantUserId,role:'owner',name:'Showroom owner',phone:app.phones[0],pushEnabled:true,smsOptIn:false,emailOptIn:false,active:true}],
        autoRenew:false,createdAt:at};
      app.orgId=org.id;state.orgs.push(org);
      const date=at.slice(0,10);
      if(this.config.starterCredits>0&&date>=this.config.foundingStart&&date<=this.config.foundingEnd){
        state.ledger.push({id:randomUUID(),orgId:org.id,delta:this.config.starterCredits,reason:'starter',reference:`starter:${org.id}`,createdAt:at});org.starterGrantedAt=at;
      }
      log(state,actor.id,'dealer_verified',org.id,id,method);return org;
    });
  }
  async getOrg(actor:DealerActor,orgId:string):Promise<DealerOrg>{const org=getOrg(await this.store.read(),orgId);member(actor,org);return copy(org)}
  async addMember(actor:DealerActor,orgId:string,value:Omit<Member,'active'>):Promise<DealerOrg>{
    return this.store.transaction(state=>{const org=getOrg(state,orgId);member(actor,org,['owner']);
      if(!['owner','manager','sales'].includes(value.role))throw new Error('Invalid dealer role');
      if(org.members.some(x=>x.userId===value.userId&&x.active))throw new Error('Staff member already exists');
      org.members.push({...copy(value),phone:cleanPhone(value.phone),active:true});log(state,actor.id,'dealer_member_added',orgId,undefined,value.userId);return org});
  }
  async updatePreferences(actor:DealerActor,orgId:string,patch:{pushEnabled?:boolean;smsOptIn?:boolean;emailOptIn?:boolean;pushToken?:string;email?:string}):Promise<Member>{
    return this.store.transaction(state=>{const org=getOrg(state,orgId);const person=member(actor,org);
      for(const key of ['pushEnabled','smsOptIn','emailOptIn','pushToken','email'] as const)if(patch[key]!==undefined)(person as any)[key]=patch[key];
      log(state,actor.id,'dealer_notification_preferences',orgId);return person});
  }
  async updateProfile(actor:DealerActor,orgId:string,patch:Partial<Pick<DealerOrg,'name'|'address'|'district'|'phones'|'whatsapp'|'logoKey'|'hours'|'about'|'autoRenew'>>):Promise<DealerOrg>{
    return this.store.transaction(state=>{const org=getOrg(state,orgId);member(actor,org,['owner','manager']);
      if(patch.name!==undefined)org.name=required(patch.name,'Showroom name',100);
      if(patch.address!==undefined)org.address=required(patch.address,'Address',250);
      if(patch.district!==undefined)org.district=required(patch.district,'District',80);
      if(patch.phones!==undefined){if(!patch.phones.length||patch.phones.length>3)throw new Error('Provide 1–3 phones');org.phones=patch.phones.map(cleanPhone)}
      if(patch.whatsapp!==undefined)org.whatsapp=cleanPhone(patch.whatsapp);
      if(patch.logoKey!==undefined)org.logoKey=required(patch.logoKey,'Logo',100);
      if(patch.hours!==undefined)org.hours=required(patch.hours,'Hours',100);
      if(patch.about!==undefined){if(patch.about.length>2000)throw new Error('About text is too long');org.about=patch.about.trim()}
      if(patch.autoRenew!==undefined)org.autoRenew=Boolean(patch.autoRenew);
      log(state,actor.id,'dealer_profile_updated',orgId);return org});
  }
  async publicProfile(slug:string){
    const org=(await this.store.read()).orgs.find(x=>x.slug===slug);if(!org)throw new Error('Dealer profile not found');
    const actor=this.syntheticActor(org);const rows=await this.listings.myListings(actor);
    const stock=await Promise.all(rows.filter(x=>x.status==='live').map(async row=>{const listing=await this.listings.getOwn(actor,row.id);
      return {id:listing.id,makeId:listing.data.makeId,modelId:listing.data.modelId,year:listing.data.manufactureYear,priceBdt:listing.data.priceBdt,
        stockNumber:listing.data.stockNumber,stockStatus:listing.data.stockStatus,expectedArrival:listing.data.expectedArrival,
        coverKey:listing.photos[0]?.webpKey,area:listing.data.area,district:listing.data.district}}));
    // No phones or WhatsApp here: this feeds anonymous HTML (D11, MSG-04).
    return {id:org.id,slug:org.slug,name:org.name,logoKey:org.logoKey,address:org.address,district:org.district,
      mapUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(org.address+', '+org.district+', Bangladesh')}`,
      hours:org.hours,about:org.about,verified:true,verifiedAt:org.verifiedAt,stock};
  }
  // A signed-in, phone-verified buyer reveals the showroom number for one car;
  // the click is recorded as a lead before the number is returned.
  async revealContact(buyer:BuyerActor,orgId:string,listingId:string,channel:'call'|'whatsapp'):Promise<ContactReveal>{
    if(buyer?.role!=='buyer'||!buyer.phoneVerified||!buyer.id)throw new Error('Sign in with a phone-verified buyer account to contact the dealer');
    if(channel!=='call'&&channel!=='whatsapp')throw new Error('Choose Call or WhatsApp');
    await this.recordLead({id:'contact-reveal',role:'system'},orgId,listingId,buyer.id,channel);
    const org=getOrg(await this.store.read(),orgId);const phone=channel==='call'?org.phones[0]:org.whatsapp;
    return {channel,phone,href:channel==='call'?`tel:${phone}`:`https://wa.me/${phone.replace(/\D/g,'')}`};
  }
  async creditBalance(actor:DealerActor,orgId:string):Promise<number>{const state=await this.store.read();member(actor,getOrg(state,orgId));return balance(state.ledger,orgId)}
  packs():CreditPack[]{return copy(this.config.packs)}
  async startPackPurchase(actor:DealerActor,orgId:string,packId:string,method:'bkash'|'nagad'|'card'):Promise<Purchase>{
    const pack=this.config.packs.find(x=>x.id===packId);if(!pack)throw new Error('Credit pack not found');
    if(!['bkash','nagad','card'].includes(method))throw new Error('Choose bKash, Nagad or card');
    const purchase=await this.store.transaction(state=>{member(actor,getOrg(state,orgId),['owner','manager']);
      const item:Purchase={id:randomUUID(),orgId,packId,credits:pack.credits,amountBdt:pack.priceBdt,method,status:'pending',createdAt:nowIso(this.clock)};
      state.purchases.push(item);log(state,actor.id,'credit_pack_checkout',orgId,undefined,item.id);return item});
    const checkout=await this.payments.createCheckout(purchase);
    return this.store.transaction(state=>{const item=state.purchases.find(x=>x.id===purchase.id)!;item.checkoutUrl=checkout.url;item.gatewayReference=checkout.reference;return item});
  }
  async confirmPackPurchase(actor:DealerActor,purchaseId:string,proof:string):Promise<Purchase>{
    if(actor.role!=='system')throw new Error('Trusted payment callback required');
    const item=(await this.store.read()).purchases.find(x=>x.id===purchaseId);if(!item)throw new Error('Purchase not found');
    if(item.status==='paid')return item;
    if(!await this.payments.verifyPayment(item,proof))throw new Error('Payment not verified');
    return this.store.transaction(state=>{const purchase=state.purchases.find(x=>x.id===purchaseId)!;
      if(purchase.status==='paid')return purchase;
      purchase.status='paid';state.ledger.push({id:randomUUID(),orgId:purchase.orgId,delta:purchase.credits,reason:'pack',reference:purchase.id,createdAt:nowIso(this.clock)});
      log(state,actor.id,'credit_pack_paid',purchase.orgId,undefined,purchase.id);return purchase});
  }
  async ledger(actor:DealerActor,orgId:string){const state=await this.store.read();member(actor,getOrg(state,orgId),['owner','manager']);return state.ledger.filter(x=>x.orgId===orgId)}
  private async checkedOrg(actor:DealerActor,orgId:string,roles:DealerRole[]=['owner','manager','sales']):Promise<DealerOrg>{
    const org=getOrg(await this.store.read(),orgId);member(actor,org,roles);return org;
  }
  private async stockNumbers(org:DealerOrg):Promise<string[]>{
    const actor=this.syntheticActor(org);const rows=await this.listings.myListings(actor);
    const listings=await Promise.all(rows.map(x=>this.listings.getOwn(actor,x.id)));
    return listings.map(x=>x.data.stockNumber).filter((x):x is string=>Boolean(x));
  }
  async createStockDraft(actor:DealerActor,orgId:string,stockNumber:string,stockStatus:'ready'|'preorder'='ready'){
    const org=await this.checkedOrg(actor,orgId);
    const stock=required(stockNumber,'Stock number',32);
    if(!/^[A-Za-z0-9_-]+$/.test(stock))throw new Error('Stock number uses letters, numbers, hyphen or underscore');
    if((await this.stockNumbers(org)).some(x=>x.toLowerCase()===stock.toLowerCase()))throw new Error('Stock number already exists');
    const listingActor=this.listingActor(actor,org);
    const draft=await this.listings.createDraft(listingActor);
    const listing=await this.listings.saveDraft(listingActor,draft.id,{stockNumber:stock,stockStatus},draft.version);
    await this.store.transaction(state=>{log(state,actor.id,'dealer_stock_draft_created',orgId,undefined,listing.id)});
    return listing;
  }
  async saveStockDraft(actor:DealerActor,orgId:string,listingId:string,patch:Partial<ListingData>,version?:number){
    const org=await this.checkedOrg(actor,orgId);
    if(patch.stockNumber){const stock=await this.stockNumbers(org);const existing=await this.listings.getOwn(this.listingActor(actor,org),listingId);
      if(stock.some(x=>x.toLowerCase()===patch.stockNumber!.toLowerCase()&&x.toLowerCase()!==existing.data.stockNumber?.toLowerCase()))throw new Error('Stock number already exists')}
    return this.listings.saveDraft(this.listingActor(actor,org),listingId,patch,version);
  }
  async stock(actor:DealerActor,orgId:string){const org=await this.checkedOrg(actor,orgId);const listingActor=this.listingActor(actor,org);
    const rows=await this.listings.myListings(listingActor);
    return Promise.all(rows.map(async row=>({...row,data:(await this.listings.getOwn(listingActor,row.id)).data})))}
  async stockDetail(actor:DealerActor,orgId:string,listingId:string){const org=await this.checkedOrg(actor,orgId);return this.listings.getOwn(this.listingActor(actor,org),listingId)}
  async publishStock(actor:DealerActor,orgId:string,listingId:string){
    const org=await this.checkedOrg(actor,orgId);
    const current=await this.listings.getOwn(this.listingActor(actor,org),listingId);
    if(current.status==='pending_review')return current;
    if(!feeCovered(current,this.clock())&&await this.creditBalance(actor,orgId)<1)throw new Error('Buy listing credits before submitting stock');
    const listingActor=this.listingActor(actor,org);
    const submitted=await this.listings.beginSubmission(listingActor,listingId);
    if(submitted.listing.status==='pending_review')return submitted.listing;
    const order=submitted.listing.feeOrders.at(-1)!;
    const confirmed=await this.listings.confirmPayment(listingId,order.id,`credit:${order.id}`);
    await this.maybeLowCredit(orgId);
    return confirmed;
  }
  async bulkReport(actor:DealerActor,orgId:string,bytes:Buffer,fileName:string):Promise<BulkReport>{
    const org=await this.checkedOrg(actor,orgId);
    const rows=await parseBulkFile(bytes,fileName);
    return validateBulkRows(rows,this.catalog,await this.stockNumbers(org));
  }
  async bulkAdd(actor:DealerActor,orgId:string,bytes:Buffer,fileName:string):Promise<{report:BulkReport;created:Array<{rowNumber:number;listingId:string}>}>{
    const org=await this.checkedOrg(actor,orgId,['owner','manager']);
    const report=await this.bulkReport(actor,orgId,bytes,fileName);const listingActor=this.listingActor(actor,org);
    const created:Array<{rowNumber:number;listingId:string}>=[];
    for(const row of report.rows.filter(x=>!x.errors.length)){
      try{const draft=await this.createStockDraft(actor,orgId,row.data.stockNumber!,row.data.stockStatus);
        await this.listings.saveDraft(listingActor,draft.id,row.data,draft.version);
        created.push({rowNumber:row.rowNumber,listingId:draft.id});
      }catch(error){row.errors.push(error instanceof Error?error.message:String(error))}
    }
    report.valid=report.rows.filter(x=>!x.errors.length).length;report.invalid=report.total-report.valid;
    await this.store.transaction(state=>{log(state,actor.id,'dealer_bulk_import',orgId,undefined,`created=${created.length};invalid=${report.invalid}`)});
    return {report,created};
  }
  async addBulkPhoto(actor:DealerActor,orgId:string,fileName:string,bytes:Buffer){
    const org=await this.checkedOrg(actor,orgId);const stockNumber=stockFromPhotoName(fileName);
    const listingActor=this.listingActor(actor,org);
    const rows=await this.listings.myListings(listingActor);
    const candidates=await Promise.all(rows.filter(x=>x.status==='draft').map(x=>this.listings.getOwn(listingActor,x.id)));
    const listing=candidates.find(x=>x.data.stockNumber?.toLowerCase()===stockNumber.toLowerCase());
    if(!listing)throw new Error(`No draft matches stock number ${stockNumber}`);
    const prepared=await preparePhoto(bytes);
    prepared.photo.webpKey=await this.media.savePublic(prepared.photo.id,'webp',prepared.webp);
    prepared.photo.avifKey=await this.media.savePublic(prepared.photo.id,'avif',prepared.avif);
    const updated=await this.listings.addPhoto(listingActor,listing.id,prepared.photo);
    return {stockNumber,listingId:listing.id,photoCount:updated.photos.length,hints:prepared.photo.hints};
  }
  // value is the new price for 'price' and the sold-via outcome for 'sold'.
  async bulkAction(actor:DealerActor,orgId:string,listingIds:string[],action:'sold'|'renew'|'price',value?:number|SoldVia){
    const org=await this.checkedOrg(actor,orgId,['owner','manager']);
    if(!Array.isArray(listingIds)||listingIds.length<1||listingIds.length>100||new Set(listingIds).size!==listingIds.length)throw new Error('Select 1–100 unique cars');
    if(action==='sold'&&!soldViaValues.includes(value as SoldVia))throw new Error("Where did it sell? Choose CarBuy, elsewhere, showroom trade-in or didn't sell");
    const listingActor=this.listingActor(actor,org);const result:Array<{listingId:string;ok:boolean;message:string}>=[];
    for(const id of listingIds){try{
      if(action==='sold')await this.listings.markSold(listingActor,id,value as SoldVia);
      else if(action==='price')await this.listings.editLive(listingActor,id,{priceBdt:value as number});
      else if(action==='renew'){
        if(await this.creditBalance(actor,orgId)<1)throw new Error('No credits available');
        const started=await this.listings.beginRenewal(listingActor,id);const order=started.listing.feeOrders.at(-1)!;
        await this.listings.confirmRenewal(id,order.id,`credit:${order.id}`);
      }else throw new Error('Invalid bulk action');
      result.push({listingId:id,ok:true,message:'Updated'});
    }catch(error){result.push({listingId:id,ok:false,message:error instanceof Error?error.message:String(error)})}}
    await this.store.transaction(state=>{log(state,actor.id,'dealer_bulk_action',orgId,undefined,`${action}${action==='sold'?`=${value}`:''}:${result.filter(x=>x.ok).length}/${result.length}`)});
    await this.maybeLowCredit(orgId);return result;
  }
  async setAutoRenew(actor:DealerActor,orgId:string,enabled:boolean){return this.updateProfile(actor,orgId,{autoRenew:enabled})}
  async autoRenewExpired(actor:DealerActor){system(actor);const results:Array<{orgId:string;listingId:string;ok:boolean;message:string}>=[];
    const state=await this.store.read();
    for(const org of state.orgs.filter(x=>x.autoRenew)){
      const listingActor=this.syntheticActor(org);const stock=await this.listings.myListings(listingActor);
      for(const item of stock.filter(x=>x.status==='expired')){
        try{if(balance((await this.store.read()).ledger,org.id)<1)throw new Error('No credits available');
          const started=await this.listings.beginRenewal(listingActor,item.id);const order=started.listing.feeOrders.at(-1)!;
          await this.listings.confirmRenewal(item.id,order.id,`credit:${order.id}`);
          results.push({orgId:org.id,listingId:item.id,ok:true,message:'Renewed'});
        }catch(error){results.push({orgId:org.id,listingId:item.id,ok:false,message:error instanceof Error?error.message:String(error)})}
      }
      await this.maybeLowCredit(org.id);
    }
    return results;
  }
  async recordLead(actor:DealerActor,orgId:string,listingId:string,buyerId:string,channel:'chat'|'call'|'whatsapp'):Promise<Lead>{
    system(actor);if(!['chat','call','whatsapp'].includes(channel))throw new Error('Invalid lead channel');
    const org=getOrg(await this.store.read(),orgId);
    const listing=await this.listings.getOwn(this.syntheticActor(org),listingId);
    if(listing.status!=='live')throw new Error('Only live dealer cars can receive leads');
    const at=nowIso(this.clock);
    const lead=await this.store.transaction(state=>{
      let item=state.leads.find(x=>x.orgId===orgId&&x.listingId===listingId&&x.buyerId===buyerId&&x.status!=='closed');
      if(!item){item={id:randomUUID(),orgId,listingId,buyerId,channel,events:[],status:'new',notes:'',createdAt:at,updatedAt:at};state.leads.push(item)}
      item.events.push({channel,at});item.updatedAt=at;
      log(state,actor.id,'dealer_lead_received',orgId,undefined,`${listingId}:${channel}`);return item;
    });
    await this.listings.recordEngagement({id:'dealer-leads',role:'system'},listingId,channel);
    await this.sendAlerts(orgId,'lead',`New ${channel} lead for stock ${listing.data.stockNumber??listingId}`);
    return lead;
  }
  async leads(actor:DealerActor,orgId:string):Promise<Lead[]>{await this.checkedOrg(actor,orgId);return (await this.store.read()).leads.filter(x=>x.orgId===orgId).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))}
  async updateLead(actor:DealerActor,orgId:string,leadId:string,patch:{status?:Lead['status'];assigneeId?:string;notes?:string}):Promise<Lead>{
    return this.store.transaction(state=>{const org=getOrg(state,orgId);member(actor,org);
      const lead=state.leads.find(x=>x.id===leadId&&x.orgId===orgId);if(!lead)throw new Error('Lead not found');
      if(patch.status!==undefined){if(!['new','contacted','qualified','closed'].includes(patch.status))throw new Error('Invalid lead status');lead.status=patch.status}
      if(patch.assigneeId!==undefined){if(!org.members.some(x=>x.userId===patch.assigneeId&&x.active))throw new Error('Assign an active staff member');lead.assigneeId=patch.assigneeId}
      if(patch.notes!==undefined){if(patch.notes.length>2000)throw new Error('Notes are too long');lead.notes=patch.notes.trim()}
      lead.updatedAt=nowIso(this.clock);log(state,actor.id,'dealer_lead_updated',orgId,undefined,leadId);return lead});
  }
  private async sendAlerts(orgId:string,kind:'lead'|'low_credit',body:string):Promise<void>{
    const state=await this.store.read();const org=getOrg(state,orgId);
    const outgoing:Array<{user:Member;channel:'push'|'sms'|'email'}>=[];
    for(const user of org.members.filter(x=>x.active)){
      if(user.pushEnabled&&user.pushToken)outgoing.push({user,channel:'push'});
      if(user.smsOptIn)outgoing.push({user,channel:'sms'});
      if(user.emailOptIn&&user.email)outgoing.push({user,channel:'email'});
    }
    for(const item of outgoing){
      const notice=await this.store.transaction(next=>{const row:Notification={id:randomUUID(),orgId,userId:item.user.userId,kind,
        channel:item.channel,body,status:'queued',createdAt:nowIso(this.clock)};next.notifications.push(row);return row});
      try{
        if(item.channel==='push')await this.notifications.push(item.user.userId,item.user.pushToken!,body);
        else if(item.channel==='sms')await this.notifications.sms(item.user.phone,body);
        else await this.notifications.email(item.user.email!,body);
        await this.store.transaction(next=>{next.notifications.find(x=>x.id===notice.id)!.status='sent'});
      }catch{await this.store.transaction(next=>{next.notifications.find(x=>x.id===notice.id)!.status='failed'})}
    }
  }
  private async maybeLowCredit(orgId:string):Promise<void>{
    const state=await this.store.read();const current=balance(state.ledger,orgId);
    if(current>this.config.lowCreditThreshold)return;
    const latest=state.ledger.filter(x=>x.orgId===orgId).at(-1)?.id??'none';
    const key=`low_credit:${orgId}:${latest}:${current}`;
    if(state.audit.some(x=>x.action==='low_credit_alert'&&x.detail===key))return;
    await this.store.transaction(next=>{log(next,'system','low_credit_alert',orgId,undefined,key)});
    await this.sendAlerts(orgId,'low_credit',`CarBuy dealer credits are low: ${current} remaining.`);
  }
  async notificationsFor(actor:DealerActor,orgId:string):Promise<Notification[]>{
    await this.checkedOrg(actor,orgId);return (await this.store.read()).notifications.filter(x=>x.orgId===orgId&&x.userId===actor.id);
  }
  async stats(actor:DealerActor,orgId:string){
    const org=await this.checkedOrg(actor,orgId);
    const stock=await this.listings.myListings(this.listingActor(actor,org));
    const cars=await Promise.all(stock.map(async row=>{const listing=await this.listings.getOwn(this.listingActor(actor,org),row.id);
      return {listingId:row.id,stockNumber:listing.data.stockNumber??'',status:row.status,impressions:row.impressions,
        views:row.views,chat:row.contacts.chat,call:row.contacts.call,whatsapp:row.contacts.whatsapp,
        contacts:row.contacts.chat+row.contacts.call+row.contacts.whatsapp,saves:row.saves}}));
    const totals=cars.reduce((sum,row)=>({impressions:sum.impressions+row.impressions,views:sum.views+row.views,
      chat:sum.chat+row.chat,call:sum.call+row.call,whatsapp:sum.whatsapp+row.whatsapp,contacts:sum.contacts+row.contacts,saves:sum.saves+row.saves}),
      {impressions:0,views:0,chat:0,call:0,whatsapp:0,contacts:0,saves:0});
    return {totals,cars};
  }
  async statsCsv(actor:DealerActor,orgId:string):Promise<string>{
    const result=await this.stats(actor,orgId);
    return csvRows([['Listing ID','Stock number','Status','Impressions','Views','Chats','Calls','WhatsApp','Contacts','Saves'],
      ...result.cars.map(x=>[x.listingId,x.stockNumber,x.status,x.impressions,x.views,x.chat,x.call,x.whatsapp,x.contacts,x.saves])]);
  }
  async conciergeAdd(actor:DealerActor,orgId:string,data:Partial<ListingData>):Promise<Listing>{
    moderator(actor);const org=getOrg(await this.store.read(),orgId);
    if(!data.stockNumber||!/^[A-Za-z0-9_-]{1,32}$/.test(data.stockNumber))throw new Error('Stock number required');
    if((await this.stockNumbers(org)).some(x=>x.toLowerCase()===data.stockNumber!.toLowerCase()))throw new Error('Stock number already exists');
    const acting:ListingActor={id:actor.id,role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:orgId};
    const draft=await this.listings.createDraft(acting);
    const listing=await this.listings.saveDraft(acting,draft.id,{stockStatus:'ready',...data},draft.version);
    await this.store.transaction(state=>{log(state,actor.id,'concierge_stock_created',orgId,undefined,listing.id)});
    return listing;
  }
  async auditLog(actor:DealerActor,orgId:string){const state=await this.store.read();
    if(actor.role!=='moderator')member(actor,getOrg(state,orgId),['owner','manager']);
    return state.audit.filter(x=>x.orgId===orgId)}
}
