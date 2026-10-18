import { randomUUID } from 'node:crypto';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import type { Listing, ListingStore } from '../../listings/src/types.ts';
import type { DealerStore } from '../../dealers/src/types.ts';
import type { SearchService } from '../../search/src/service.ts';
import type { ActivityStore, BillingPort, DetailOutcome, PrivateSeller, SellerProfilePort, TranslationPort, VehicleDetail, Viewer, VerificationOrder } from './types.ts';

const day=86_400_000;
const copy=<T>(x:T):T=>structuredClone(x);
const masked=(value:string)=>value?`•••• ${value.slice(-4)}`:'Not available';
const idPattern=/^[a-zA-Z0-9-]{1,80}$/;
function engineBand(cc:number):string{
  if(cc<=1500)return 'Up to 1,500 cc';if(cc<=2000)return '1,501–2,000 cc';
  if(cc<=2500)return '2,001–2,500 cc';if(cc<=3000)return '2,501–3,000 cc';return 'Above 3,000 cc';
}
export class DetailError extends Error {readonly status:number;constructor(status:number,message:string){super(message);this.status=status}}
function availability(listing:Listing,now:Date):'live'|'sold'|'expired'|null{
  if(listing.status==='live')return listing.expiresAt&&Date.parse(listing.expiresAt)>now.getTime()?'live':'expired';
  if(listing.status==='sold')return 'sold';if(listing.status==='expired')return 'expired';return null;
}
function closedTime(listing:Listing,status:'sold'|'expired'):number{
  return Date.parse(listing.closedAt??(status==='expired'?listing.expiresAt:undefined)??listing.updatedAt);
}
export class VehicleDetailService {
  private readonly args:{listings:ListingStore;catalog:CatalogService;search:SearchService;dealers?:DealerStore;
    profiles:SellerProfilePort;activity:ActivityStore;translation?:TranslationPort;billing?:BillingPort;
    verificationPriceBdt?:number;clock?:()=>Date;trackMetrics?:boolean};
  constructor(args:{listings:ListingStore;catalog:CatalogService;search:SearchService;dealers?:DealerStore;
    profiles:SellerProfilePort;activity:ActivityStore;translation?:TranslationPort;billing?:BillingPort;
    verificationPriceBdt?:number;clock?:()=>Date;trackMetrics?:boolean}){this.args=args}
  private now(){return (this.args.clock??(()=>new Date()))()}
  private async listing(id:string){if(!idPattern.test(id))throw new DetailError(400,'Invalid car ID');
    const found=(await this.args.listings.read()).listings.find(x=>x.id===id);
    if(!found)throw new DetailError(404,'Car not found');return found}
  private async visible(id:string){const item=await this.listing(id),status=availability(item,this.now());
    if(!status)throw new DetailError(404,'Car not found');return {item,status}}
  async publicDetail(id:string,locale:'en'|'bn'):Promise<DetailOutcome>{
    const {item,status}=await this.visible(id),d=item.data,now=this.now();
    const catalog=await this.args.catalog.snapshot();
    const make=catalog.makes.find(x=>x.id===d.makeId),model=catalog.models.find(x=>x.id===d.modelId),grade=catalog.grades.find(x=>x.id===d.gradeId);
    if(!make||!model||!d.manufactureYear||!d.priceBdt||d.mileageKm===undefined||!d.engineCc||!d.condition||!d.district||!d.area)throw new DetailError(404,'Car details unavailable');
    const modelUrl=`${locale==='bn'?'/bn':''}/cars/${encodeURIComponent(make.id)}/${encodeURIComponent(model.id)}`;
    if(status!=='live'&&now.getTime()-closedTime(item,status)>=30*day)return {kind:'redirect',to:modelUrl};
    const org=item.sellerType==='dealer'?(await this.args.dealers?.read())?.orgs.find(x=>x.id===item.sellerId):undefined;
    const privateProfile:PrivateSeller|undefined=item.sellerType==='private'?await this.args.profiles.privateSeller(item.sellerId):undefined;
    const seller:VehicleDetail['seller']=item.sellerType==='dealer'?{type:'dealer',name:org?.name??'Dealer',verified:Boolean(org?.verifiedAt),
      address:org?.address??'',hours:org?.hours??'',logoKey:org?.logoKey||null,slug:org?.slug??''}:
      {type:'private',name:privateProfile?.name??'Private seller',memberSince:privateProfile?.memberSince??null,
        phoneVerified:Boolean(privateProfile?.phoneVerified),responseHours:privateProfile?.responseHours??null};
    const sameModel=await this.args.search.search({locale,sort:'best_match',page:1,modelIds:[model.id]});
    let similar=sameModel.cards.filter(x=>x.id!==item.id).slice(0,4);
    if(similar.length<4){const sameMake=await this.args.search.search({locale,sort:'best_match',page:1,makeId:make.id});
      const seen=new Set([item.id,...similar.map(x=>x.id)]);similar=[...similar,...sameMake.cards.filter(x=>!seen.has(x.id)).slice(0,4-similar.length)];}
    const auction=item.auctionSheet;
    const paidRequest=(await this.args.activity.read()).orders.some(x=>x.listingId===id&&x.status==='paid');
    const statusAuction=auction?.status==='verified'?'verified':paidRequest?'verification_ordered':auction?.status??'none';
    const auctionMileage=auction?.mileageKm??null;
    const mismatch=statusAuction==='verified'&&auctionMileage!==null&&d.mileageKm+500<auctionMileage;
    const description=d.description??'',descriptionLanguage=/[\u0980-\u09ff]/.test(description)?'bn':'en';
    const detail:VehicleDetail={id:item.id,availability:status,
      title:`${d.manufactureYear} ${make.name[locale]} ${model.name[locale]} ${d.gradeId==='not-listed'?d.gradeFreeText??'Other':grade?.name[locale]??d.gradeId??''}`,
      makeId:make.id,modelId:model.id,priceBdt:d.priceBdt,priceLakh:Math.round(d.priceBdt/10000)/10,
      negotiable:Boolean(d.negotiable),condition:d.condition,mileageKm:d.mileageKm,engineCc:d.engineCc,
      fuel:d.fuel??'',manufactureYear:d.manufactureYear,registrationYear:d.registrationYear??null,area:d.area,district:d.district,
      colour:d.colour??null,transmission:d.transmission??'',body:d.body??'',owners:d.owners??null,
      photos:[...item.photos].sort((a,b)=>a.position-b.position).map(x=>({webpKey:x.webpKey,avifKey:x.avifKey,position:x.position})),
      features:(d.featureIds??[]).map(id=>catalog.features.find(x=>x.id===id&&x.active)).filter((x):x is NonNullable<typeof x>=>Boolean(x))
        .map(x=>({id:x.id,name:x.name[locale],group:x.group})),
      description:{text:description,language:descriptionLanguage,translationAvailable:Boolean(this.args.translation)&&Boolean(description)},
      trust:{auctionStatus:statusAuction,auctionGrade:auction?.grade??null,auctionMileageKm:auctionMileage,mileageMismatch:mismatch,
        papersChecked:item.papersChecked,chassisMasked:masked(d.chassisNumber??''),
        taxTokenExpiry:d.taxTokenExpiry??null,fitnessExpiry:d.fitnessExpiry??null},
      seller,similar,priceHistory:[...item.priceHistory].sort((a,b)=>a.at.localeCompare(b.at)).map(x=>({priceBdt:x.priceBdt,at:x.at})),
      daysListed:Math.max(0,Math.floor(((status==='live'?now.getTime():closedTime(item,status))-Date.parse(item.publishedAt??item.createdAt))/day)),
      runningCost:{engineBand:engineBand(d.engineCc),fuel:d.fuel??'',sourceUrl:'https://brta.gov.bd/pages/static-pages/6922e058933eb65569e269cd'},
      publishedAt:item.publishedAt??item.createdAt,closedAt:status==='live'?null:new Date(closedTime(item,status)).toISOString(),
      canContact:status==='live'&&Boolean(item.sellerType==='dealer'?(org?.phones.length):privateProfile?.phone)};
    return {kind:'detail',detail};
  }
  async translate(id:string,to:'en'|'bn'){
    const {item}=await this.visible(id);const description=item.data.description??'';
    if(!description)throw new DetailError(404,'No description');
    if(!this.args.translation)throw new DetailError(503,'Translation is unavailable');
    const translated=await this.args.translation.translate(description,to);
    if(!translated)throw new DetailError(503,'Translation is unavailable');return {text:translated,language:to};
  }
  async revealChassis(viewer:Viewer|undefined,id:string){
    if(!viewer)throw new DetailError(401,'Sign in to view the chassis number');
    const {item}=await this.visible(id);const chassis=item.data.chassisNumber;
    if(!chassis)throw new DetailError(404,'Chassis number unavailable');
    await this.args.activity.transaction(state=>{state.reveals.push({id:randomUUID(),listingId:id,buyerId:viewer.id,at:this.now().toISOString()})});
    return {chassisNumber:chassis};
  }
  async contact(viewer:Viewer|undefined,id:string,channel:'chat'|'call'|'whatsapp'){
    if(!viewer)throw new DetailError(401,'Sign in to contact the seller');
    if(!viewer.phoneVerified)throw new DetailError(403,'Verify your phone to contact the seller');
    if(!['chat','call','whatsapp'].includes(channel))throw new DetailError(400,'Invalid contact channel');
    const {item,status}=await this.visible(id);if(status!=='live')throw new DetailError(410,'This car is no longer available');
    const org=item.sellerType==='dealer'?(await this.args.dealers?.read())?.orgs.find(x=>x.id===item.sellerId):undefined;
    const privateProfile=item.sellerType==='private'?await this.args.profiles.privateSeller(item.sellerId):undefined;
    const phone=item.sellerType==='dealer'?org?.phones[0]:privateProfile?.phone;
    const whatsapp=item.sellerType==='dealer'?org?.whatsapp:privateProfile?.whatsapp??phone;
    if(!phone)throw new DetailError(503,'Seller contact is unavailable');
    await this.args.activity.transaction(state=>{state.leads.push({id:randomUUID(),listingId:id,buyerId:viewer.id,channel,at:this.now().toISOString()})});
    if(this.args.trackMetrics)await this.args.listings.transaction(state=>{const row=state.listings.find(x=>x.id===id);if(row)row.metrics[channel]++});
    if(channel==='chat')return {channel,chatId:`${id}:${viewer.id}`,message:'Chat handoff reserved for 9.7 messaging'};
    const number=channel==='whatsapp'?whatsapp:phone;
    return {channel,url:channel==='call'?`tel:${number}`:`https://wa.me/${number!.replace(/\D/g,'')}`};
  }
  async report(viewer:Viewer|undefined,id:string,reason:'suspected_scam'|'incorrect_details'|'sold_elsewhere'|'other',note=''){
    if(!viewer)throw new DetailError(401,'Sign in to report a car');
    if(!['suspected_scam','incorrect_details','sold_elsewhere','other'].includes(reason)||note.length>1000)throw new DetailError(400,'Invalid report');
    await this.visible(id);
    const report=await this.args.activity.transaction(state=>{const record={id:randomUUID(),listingId:id,buyerId:viewer.id,reason,note:note.trim(),at:this.now().toISOString()};state.reports.push(record);return record});
    return {id:report.id,status:'received'};
  }
  async requestAuctionVerification(viewer:Viewer|undefined,id:string){
    if(!viewer)throw new DetailError(401,'Sign in to request auction verification');
    if(!viewer.phoneVerified)throw new DetailError(403,'Verify your phone to request auction verification');
    const {item,status}=await this.visible(id);if(status!=='live')throw new DetailError(410,'This car is no longer available');
    if(item.auctionSheet?.status==='verified')throw new DetailError(409,'Auction sheet is already verified');
    if(!this.args.billing)throw new DetailError(503,'Paid verification is not available');
    const orders=(await this.args.activity.read()).orders;
    if(orders.some(x=>x.listingId===id&&x.status==='paid'))throw new DetailError(409,'Verification is already requested');
    const previous=orders.find(x=>x.listingId===id&&x.buyerId===viewer.id&&x.status==='pending');
    if(previous)return copy(previous);
    const order:VerificationOrder={id:randomUUID(),listingId:id,buyerId:viewer.id,amountBdt:this.args.verificationPriceBdt??500,
      status:'pending',createdAt:this.now().toISOString()};
    if(order.amountBdt<=0)throw new DetailError(500,'Invalid verification price');
    const checkout=await this.args.billing.createCheckout(order);
    order.checkoutUrl=checkout.url;order.paymentReference=checkout.reference;
    return this.args.activity.transaction(state=>{const current=state.orders.find(x=>x.listingId===id&&x.buyerId===viewer.id&&x.status==='pending');
      if(current)return current;state.orders.push(order);return order});
  }
  async confirmVerificationPayment(actor:{role:'system'},orderId:string,proof:string){
    if(actor.role!=='system'||!this.args.billing)throw new DetailError(403,'Trusted payment callback required');
    const order=(await this.args.activity.read()).orders.find(x=>x.id===orderId);
    if(!order)throw new DetailError(404,'Order not found');
    if(order.status==='paid')return order;
    if(!await this.args.billing.verify(order,proof))throw new DetailError(400,'Payment not verified');
    return this.args.activity.transaction(state=>{const current=state.orders.find(x=>x.id===orderId)!;
      if(current.status==='pending'){current.status='paid';current.paidAt=this.now().toISOString()}return current});
  }
}
