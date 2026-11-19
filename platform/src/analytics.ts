import { randomUUID } from 'node:crypto';

export const eventNames=[
  'search_performed','listing_clicked','vdp_viewed','chat_started','call_clicked','whatsapp_clicked','seller_replied',
  'listing_saved','saved_search_created','sell_step_completed','chassis_decoded','papers_uploaded','papers_checked',
  'auction_sheet_ordered','auction_sheet_delivered','listing_published','listing_marked_sold','listing_fee_paid',
  'boost_purchased','credits_purchased','report_submitted','signup_completed','app_installed','language_switched',
] as const;
export type EventName=typeof eventNames[number];
const propertyKeys=new Set(['listing_id','position','source','seller_type','response_minutes','result_count','language','sort',
  'step','platform','success','chassis_code','result','found','mismatch','hours','review_minutes','sold_via','days_live',
  'product','amount','method','target','reason','from','to','utm_source','utm_medium','utm_campaign','referrer_host']);
export type AnalyticsEvent={id:string;name:EventName;visitorId:string;at:string;properties:Record<string,string|number|boolean>};
const safe=(value:unknown):value is string|number|boolean=>typeof value==='boolean'||
  typeof value==='number'&&Number.isFinite(value)||typeof value==='string'&&value.length<=100&&!/[\r\n]/.test(value);
export function attribution(input:{url:string;referrer?:string;installReferrer?:string}){
  const url=new URL(input.url,'https://carbuy.invalid'),params=url.searchParams;
  const install=input.installReferrer?new URLSearchParams(input.installReferrer):undefined;
  const values:Record<string,string>={};
  for(const key of ['utm_source','utm_medium','utm_campaign'] as const){const value=(params.get(key)??install?.get(key)??'').trim();
    if(value&&value.length<=100&&/^[\p{L}\p{N}_. -]+$/u.test(value))values[key]=value;}
  if(input.referrer){try{const ref=new URL(input.referrer);if(ref.protocol==='https:'||ref.protocol==='http:')values.referrer_host=ref.hostname.slice(0,100)}catch{}}
  return values;
}
export class AnalyticsService{
  private readonly consents=new Map<string,boolean>();
  private readonly events:AnalyticsEvent[]=[];
  setConsent(visitorId:string,enabled:boolean){if(!/^[a-zA-Z0-9_-]{8,100}$/.test(visitorId))throw new Error('Invalid visitor ID');
    this.consents.set(visitorId,enabled);if(!enabled){for(let i=this.events.length-1;i>=0;i--)if(this.events[i].visitorId===visitorId)this.events.splice(i,1)}}
  hasConsent(visitorId:string){return this.consents.get(visitorId)===true}
  track(visitorId:string,name:EventName,properties:Record<string,unknown>={},at=new Date()):AnalyticsEvent|null{
    if(!this.hasConsent(visitorId))return null;
    if(!(eventNames as readonly string[]).includes(name))throw new Error('Unknown event');
    const projected:AnalyticsEvent['properties']={};
    for(const [key,value] of Object.entries(properties))if(propertyKeys.has(key)&&safe(value))projected[key]=value;
    const event={id:randomUUID(),name,visitorId,properties:projected,at:at.toISOString()};this.events.push(event);return structuredClone(event);
  }
  exportFor(visitorId:string){return this.events.filter(x=>x.visitorId===visitorId).map(x=>structuredClone(x))}
}
