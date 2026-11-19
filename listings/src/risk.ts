import type { Listing } from './types.ts';

export type RiskSignal={code:'new_account'|'duplicate_chassis'|'duplicate_photo'|'low_price'|'contact_in_text'|'contact_in_photo'|'posting_velocity';detail:string};
export type RiskContext={accountCreatedAt?:string;photoText?:string[];now?:Date;lowRiskAutoPublish?:boolean};
const normalize=(value:string)=>value.normalize('NFKC').replace(/[\s-]/g,'').toUpperCase();
const phoneOrLink=/(?:\+?880|0)1[3-9]\d{8}|(?:https?:\/\/|www\.|wa\.me\/|t\.me\/|\.com\b|\.bd\b)/i;
export function hashDistance(a:string,b:string):number{
  if(!/^[a-f0-9]{16}$/i.test(a)||!/^[a-f0-9]{16}$/i.test(b))return 64;
  let bits=BigInt(`0x${a}`)^BigInt(`0x${b}`),count=0;
  while(bits){bits&=bits-1n;count++}return count;
}
export function assessListingRisk(listing:Listing,all:Listing[],context:RiskContext={}){
  const signals:RiskSignal[]=[],now=context.now??new Date();
  const add=(code:RiskSignal['code'],detail:string)=>signals.push({code,detail});
  if(!context.accountCreatedAt||now.getTime()-Date.parse(context.accountCreatedAt)<7*86_400_000)
    add('new_account','Seller account age is under seven days or unknown');
  const other=all.filter(x=>x.id!==listing.id&&x.status!=='removed'&&x.status!=='rejected');
  const chassis=normalize(listing.data.chassisNumber??'');
  if(chassis&&other.some(x=>normalize(x.data.chassisNumber??'')===chassis))add('duplicate_chassis','Chassis appears in another listing');
  if(listing.photos.some(photo=>other.some(x=>x.photos.some(existing=>photo.sha256===existing.sha256||
    Boolean(photo.perceptualHash&&existing.perceptualHash&&hashDistance(photo.perceptualHash,existing.perceptualHash)<=6)))))
    add('duplicate_photo','Photo matches or closely resembles another listing');
  const comparables=other.filter(x=>x.status==='live'&&x.data.makeId===listing.data.makeId&&x.data.modelId===listing.data.modelId&&
    Math.abs((x.data.manufactureYear??0)-(listing.data.manufactureYear??0))<=2&&Number.isFinite(x.data.priceBdt)).map(x=>x.data.priceBdt!).sort((a,b)=>a-b);
  if(comparables.length>=3&&listing.data.priceBdt&&listing.data.priceBdt<comparables[Math.floor(comparables.length/2)]*0.65)
    add('low_price','Asking price is over 35% below similar live cars');
  if(phoneOrLink.test(listing.data.description??''))add('contact_in_text','Phone number or external link appears in description');
  if((context.photoText??[]).some(x=>phoneOrLink.test(x)))add('contact_in_photo','Phone number or external link appears in photo OCR');
  const dayAgo=now.getTime()-86_400_000;
  if(all.filter(x=>x.sellerId===listing.sellerId&&Date.parse(x.createdAt)>=dayAgo).length>=4)
    add('posting_velocity','Seller created four or more listings in 24 hours');
  return {signals,autoPublish:Boolean(context.lowRiskAutoPublish)&&signals.length===0,requiresReview:!context.lowRiskAutoPublish||signals.length>0};
}
