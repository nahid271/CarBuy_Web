import { createHash } from 'node:crypto';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import type { CatalogSnapshot } from '../../vehicle-data/src/types.ts';
import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import type { Listing, ListingStore } from '../../listings/src/types.ts';
import type { DealerStore } from '../../dealers/src/types.ts';
import { districts, divisions, findDistrict, locationMatches } from './locations.ts';
import type { FacetOption, Promotion, PromotionPort, SearchCard, SearchFacets, SearchQuery, SearchResult } from './types.ts';

type Item={listing:Listing;card:SearchCard;terms:string[];modelTerms:string[]};
const compact=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/\u09df/g,'\u09af').replace(/[\p{P}\p{S}\s]+/gu,'');
const label=(en:string,bn:string,locale:'en'|'bn')=>locale==='bn'?bn:en;
const count=(items:Item[],predicate:(item:Item)=>boolean)=>items.reduce((n,item)=>n+(predicate(item)?1:0),0);
const compareNewest=(a:Item,b:Item)=>b.card.publishedAt.localeCompare(a.card.publishedAt)||a.card.id.localeCompare(b.card.id);
const noPromotions:PromotionPort={async active(){return []}};
function parseGrade(value:string|undefined):number|undefined{if(!value)return undefined;const match=/^(\d(?:\.5)?)$/.exec(value.trim());
  const n=match?Number(match[1]):NaN;return Number.isFinite(n)&&n>=0&&n<=6?n:undefined}
function isLive(listing:Listing,now:Date):boolean{return listing.status==='live'&&!!listing.expiresAt&&Date.parse(listing.expiresAt)>now.getTime()}
function score(item:Item,q:SearchQuery,now:Date):number{
  const l=item.listing,c=item.card;
  const words=(q.keyword??'').split(/\s+/).map(compact).filter(Boolean);
  let relevance=words.length?words.filter(w=>item.modelTerms.some(t=>t===w)).length*22+words.filter(w=>item.terms.some(t=>t.includes(w))).length*7:0;
  if(words.length&&item.modelTerms.some(t=>t===compact(q.keyword!)))relevance+=30;
  const age=Math.max(0,(now.getTime()-Date.parse(c.publishedAt))/86_400_000);
  const freshness=Math.max(0,22-age*.7);
  const quality=Math.min(12,l.photos.length*2)+Math.min(5,(l.data.description?.length??0)/80)+(l.data.featureIds?.length?3:0)+(l.photos[0]?.webpKey?2:0);
  const trust=(c.auctionVerified?12:0)+(c.papersChecked?7:0)+(c.verifiedDealer?7:0);
  return Math.round((relevance+freshness+quality+trust)*100)/100;
}
function matches(item:Item,q:SearchQuery,omit?:string):boolean{
  const d=item.listing.data,c=item.card;
  if(omit!=='keyword'&&q.keyword){const words=q.keyword.split(/\s+/).map(compact).filter(Boolean);
    if(!words.every(word=>item.terms.some(term=>term.includes(word))))return false}
  if(omit!=='condition'&&q.condition&&d.condition!==q.condition)return false;
  if(omit!=='make'&&q.makeId&&d.makeId!==q.makeId)return false;
  if(omit!=='model'&&q.modelIds?.length&&!q.modelIds.includes(d.modelId??''))return false;
  if(omit!=='grade'&&q.gradeId&&d.gradeId!==q.gradeId)return false;
  if(q.minPriceLakh!==undefined&&(d.priceBdt??0)<q.minPriceLakh*100000)return false;
  if(q.maxPriceLakh!==undefined&&(d.priceBdt??Infinity)>q.maxPriceLakh*100000)return false;
  if(q.minYear!==undefined&&(d.manufactureYear??0)<q.minYear)return false;
  if(q.maxYear!==undefined&&(d.manufactureYear??Infinity)>q.maxYear)return false;
  if(q.minRegistrationYear!==undefined&&(d.registrationYear??0)<q.minRegistrationYear)return false;
  if(q.maxRegistrationYear!==undefined&&(d.registrationYear??Infinity)>q.maxRegistrationYear)return false;
  if(q.minMileageKm!==undefined&&(d.mileageKm??0)<q.minMileageKm)return false;
  if(q.maxMileageKm!==undefined&&(d.mileageKm??Infinity)>q.maxMileageKm)return false;
  if(q.minEngineCc!==undefined&&(d.engineCc??0)<q.minEngineCc)return false;
  if(q.maxEngineCc!==undefined&&(d.engineCc??Infinity)>q.maxEngineCc)return false;
  if(omit!=='fuel'&&q.fuel&&d.fuel!==q.fuel)return false;
  if(omit!=='body'&&q.body&&d.body!==q.body)return false;
  if(omit!=='transmission'&&q.transmission&&d.transmission!==q.transmission)return false;
  if(omit!=='colour'&&q.colour&&compact(d.colour??'')!==compact(q.colour))return false;
  if(omit!=='sellerType'&&q.sellerType&&item.listing.sellerType!==q.sellerType)return false;
  if(omit!=='division'&&q.division&&!locationMatches(d.district??'',q.division))return false;
  if(omit!=='district'&&q.district&&!locationMatches(d.district??'',undefined,q.district))return false;
  if(omit!=='area'&&q.area&&compact(d.area??'')!==compact(q.area))return false;
  if(omit!=='auctionVerified'&&q.auctionVerified&& !c.auctionVerified)return false;
  if(omit!=='papersChecked'&&q.papersChecked&& !c.papersChecked)return false;
  if(omit!=='verifiedDealer'&&q.verifiedDealer&& !c.verifiedDealer)return false;
  if(q.minAuctionGrade!==undefined&&(!c.auctionVerified||c.auctionGrade===undefined||c.auctionGrade<q.minAuctionGrade))return false;
  return true;
}
function sortItems(items:Item[],q:SearchQuery):Item[]{
  const result=[...items];result.sort((a,b)=>{
    let delta=0;
    if(q.sort==='best_match')delta=b.card.score-a.card.score;
    if(q.sort==='newest')delta=b.card.publishedAt.localeCompare(a.card.publishedAt);
    if(q.sort==='price_asc')delta=a.card.priceBdt-b.card.priceBdt;
    if(q.sort==='price_desc')delta=b.card.priceBdt-a.card.priceBdt;
    if(q.sort==='mileage_asc')delta=a.card.mileageKm-b.card.mileageKm;
    if(q.sort==='year_desc')delta=b.card.year-a.card.year;
    return delta||compareNewest(a,b);
  });return result;
}
function facets(items:Item[],q:SearchQuery,catalog:CatalogSnapshot):SearchFacets{
  const locale=q.locale;
  const scoped=(key:string)=>items.filter(item=>matches(item,q,key));
  const options=(key:string,values:Array<[string,string]>,value:(item:Item)=>string|undefined):FacetOption[]=>{
    const subset=scoped(key);return values.map(([id,name])=>({id,label:name,count:count(subset,item=>value(item)===id)}));
  };
  const models=catalog.models.filter(x=>x.active&&(!q.makeId||x.makeId===q.makeId));
  const modelIds=new Set(q.modelIds??models.map(x=>x.id));
  const generationIds=new Set(catalog.generations.filter(x=>modelIds.has(x.modelId)).map(x=>x.id));
  const grades=catalog.grades.filter(x=>x.active&&generationIds.has(x.generationId));
  const areaValues=[...new Set(scoped('area').filter(x=>!q.district||findDistrict(x.card.district)?.id===q.district).map(x=>x.card.area).filter(Boolean))].sort();
  const colours=[...new Set(scoped('colour').map(x=>x.card.colour).filter((x):x is string=>Boolean(x)))].sort();
  return {
    condition:options('condition',[['used',label('Used','ব্যবহৃত',locale)],['reconditioned',label('Reconditioned','রিকন্ডিশন্ড',locale)]],x=>x.card.condition),
    make:options('make',catalog.makes.filter(x=>x.active).map(x=>[x.id,x.name[locale]]),x=>x.card.makeId),
    model:options('model',models.map(x=>[x.id,x.name[locale]]),x=>x.card.modelId),
    grade:options('grade',[...grades.map(x=>[x.id,x.name[locale]] as [string,string]),['not-listed',label('Not listed','তালিকায় নেই',locale)]],x=>x.card.gradeId),
    fuel:options('fuel',Object.entries(fuelValues).map(([id,v])=>[id,v[locale]]),x=>x.card.fuel),
    body:options('body',Object.entries(bodyValues).map(([id,v])=>[id,v[locale]]),x=>x.card.body),
    transmission:options('transmission',Object.entries(transmissionValues).map(([id,v])=>[id,v[locale]]),x=>x.card.transmission),
    sellerType:options('sellerType',[['private',label('Private seller','ব্যক্তিগত বিক্রেতা',locale)],['dealer',label('Dealer','ডিলার',locale)]],x=>x.card.sellerType),
    division:options('division',divisions.map(x=>[x.id,x[locale]]),x=>x.card.division),
    district:options('district',districts.filter(x=>!q.division||x.divisionId===q.division).map(x=>[x.id,x[locale]]),x=>findDistrict(x.card.district)?.id),
    area:options('area',areaValues.map(x=>[x,x]),x=>x.card.area),
    colour:options('colour',colours.map(x=>[x,x]),x=>x.card.colour),
    trust:[
      {id:'auctionVerified',label:label('Verified auction sheet','যাচাইকৃত অকশন শিট',locale),count:count(scoped('auctionVerified'),x=>x.card.auctionVerified)},
      {id:'papersChecked',label:label('Papers checked','কাগজপত্র যাচাই',locale),count:count(scoped('papersChecked'),x=>x.card.papersChecked)},
      {id:'verifiedDealer',label:label('Verified dealer','যাচাইকৃত ডিলার',locale),count:count(scoped('verifiedDealer'),x=>x.card.verifiedDealer)},
    ],
  };
}
function suggestions(q:SearchQuery,total:number):string[]{if(total>3)return [];
  const bn=q.locale==='bn';const result:string[]=[];
  if(q.keyword)result.push(bn?'ভিন্ন বানান বা ছোট শব্দ দিয়ে খুঁজুন।':'Try a shorter keyword or another spelling.');
  if(q.maxPriceLakh!==undefined||q.minPriceLakh!==undefined)result.push(bn?'দামের সীমা বাড়ান বা সরান।':'Widen or remove the price range.');
  if(q.division||q.district||q.area)result.push(bn?'অন্য এলাকা বা সারা দেশে খুঁজুন।':'Try a wider location.');
  if(q.auctionVerified||q.papersChecked||q.verifiedDealer||q.minAuctionGrade!==undefined)result.push(bn?'একটি ট্রাস্ট ফিল্টার সরিয়ে দেখুন।':'Try removing a trust filter.');
  if(!result.length)result.push(bn?'নতুন গাড়ির জন্য সার্চ সংরক্ষণ করুন।':'Save this search to revisit when new cars arrive.');
  return result.slice(0,3);
}
function querySignature(q:SearchQuery):string{return createHash('sha256').update(JSON.stringify({...q,page:1})).digest('hex').slice(0,16)}
export function encodeCursor(page:number,q:SearchQuery):string{return Buffer.from(JSON.stringify({p:page,h:querySignature(q)})).toString('base64url')}
export function decodeCursor(value:string,q:SearchQuery):number{
  if(value.length>200)throw new Error('Invalid cursor');
  try{const parsed=JSON.parse(Buffer.from(value,'base64url').toString('utf8'));
    if(!Number.isInteger(parsed.p)||parsed.p<1||parsed.p>10000||parsed.h!==querySignature(q))throw new Error('Invalid cursor');
    return parsed.p}catch{throw new Error('Invalid cursor')}
}

export class SearchService {
  private readonly listings:ListingStore;private readonly catalog:CatalogService;private readonly dealers?:DealerStore;
  private readonly promotions:PromotionPort;private readonly clock:()=>Date;
  constructor(args:{listings:ListingStore;catalog:CatalogService;dealers?:DealerStore;promotions?:PromotionPort;clock?:()=>Date}){
    this.listings=args.listings;this.catalog=args.catalog;this.dealers=args.dealers;this.promotions=args.promotions??noPromotions;this.clock=args.clock??(()=>new Date());
  }
  private async index(locale:'en'|'bn'):Promise<{items:Item[];catalog:CatalogSnapshot;promotions:Promotion[]}>{
    const now=this.clock();const [state,catalog,dealerState,promotions]=await Promise.all([
      this.listings.read(),this.catalog.snapshot(),this.dealers?.read(),this.promotions.active(now)]);
    const verified=new Set((dealerState?.orgs??[]).filter(x=>Boolean(x.verifiedAt)).map(x=>x.id));
    const items:Item[]=[];
    for(const listing of state.listings.filter(x=>isLive(x,now))){const d=listing.data;
      if(!d.makeId||!d.modelId||!d.manufactureYear||!d.gradeId||!d.priceBdt||d.mileageKm===undefined||!d.engineCc||!d.fuel||!d.body||!d.transmission||!d.condition||!d.district||!d.area||!listing.publishedAt)continue;
      const make=catalog.makes.find(x=>x.id===d.makeId&&x.active),model=catalog.models.find(x=>x.id===d.modelId&&x.active&&x.makeId===make?.id);
      if(!make||!model)continue;
      const grade=catalog.grades.find(x=>x.id===d.gradeId&&x.active);
      const gradeName=d.gradeId==='not-listed'?d.gradeFreeText??label('Other grade','অন্যান্য গ্রেড',locale):grade?.name[locale]??d.gradeId;
      const auctionVerified=listing.auctionSheet?.status==='verified';
      const card:SearchCard={id:listing.id,title:`${d.manufactureYear} ${make.name[locale]} ${model.name[locale]} ${gradeName}`,
        makeId:d.makeId,modelId:d.modelId,gradeId:d.gradeId,year:d.manufactureYear,priceBdt:d.priceBdt,
        priceLakh:Math.round(d.priceBdt/10000)/10,condition:d.condition,mileageKm:d.mileageKm,engineCc:d.engineCc,
        fuel:d.fuel,body:d.body,transmission:d.transmission,colour:d.colour,district:d.district,division:findDistrict(d.district)?.divisionId,
        area:d.area,sellerType:listing.sellerType,coverKey:listing.photos[0]?.webpKey||undefined,
        auctionVerified,papersChecked:listing.papersChecked,verifiedDealer:listing.sellerType==='dealer'&&verified.has(listing.sellerId),
        auctionGrade:auctionVerified?parseGrade(listing.auctionSheet?.grade):undefined,publishedAt:listing.publishedAt,score:0};
      const modelTerms=[model.id,model.name.en,model.name.bn,...model.aliases].map(compact).filter(Boolean);
      const terms=[...modelTerms,make.id,make.name.en,make.name.bn,...make.aliases,gradeName,grade?.name.en??'',grade?.name.bn??'',
        d.colour??'',d.district,d.area,d.description??'',bodyValues[d.body].en,bodyValues[d.body].bn].map(compact).filter(Boolean);
      items.push({listing,card,terms,modelTerms});
    }
    return {items,catalog,promotions:promotions.filter(x=>x.status==='paid'&&Boolean(x.paymentReference)&&Date.parse(x.startsAt)<=now.getTime()&&Date.parse(x.endsAt)>now.getTime())};
  }
  async search(q:SearchQuery):Promise<SearchResult>{
    const {items,catalog,promotions}=await this.index(q.locale),now=this.clock();
    for(const item of items)item.card.score=score(item,q,now);
    const filtered=sortItems(items.filter(x=>matches(x,q)),q);
    const activeByListing=new Map<string,Promotion>();
    for(const promo of promotions){const old=activeByListing.get(promo.listingId);
      if(!old||promo.kind==='top'&&old.kind==='featured')activeByListing.set(promo.listingId,promo)}
    const pages:SearchCard[][]=[];let remaining=[...filtered];
    while(remaining.length){
      const paid=remaining.filter(x=>activeByListing.has(x.card.id)).sort((a,b)=>{
        const pa=activeByListing.get(a.card.id)!,pb=activeByListing.get(b.card.id)!;
        return (pa.kind==='top'?0:1)-(pb.kind==='top'?0:1)||b.card.score-a.card.score||compareNewest(a,b)}).slice(0,3);
      const selected=new Set(paid.map(x=>x.card.id));
      const organic=remaining.filter(x=>!selected.has(x.card.id)).slice(0,24-paid.length);
      pages.push([...paid.map(x=>({...x.card,placement:activeByListing.get(x.card.id)!.kind})),...organic.map(x=>({...x.card}))]);
      const shown=new Set([...paid,...organic].map(x=>x.card.id));
      remaining=remaining.filter(x=>!shown.has(x.card.id));
    }
    const pageItems=pages[q.page-1]??[];
    return {query:q,total:filtered.length,page:q.page,pageSize:24,totalPages:pages.length,cards:pageItems,
      facets:facets(items,q,catalog),suggestions:suggestions(q,filtered.length),nextCursor:q.page<pages.length?encodeCursor(q.page+1,q):null};
  }
  async cardsByIds(ids:string[],locale:'en'|'bn'):Promise<SearchCard[]>{
    if(ids.length>20||ids.some(x=>!/^[a-zA-Z0-9-]{1,80}$/.test(x)))throw new Error('Invalid car IDs');
    const {items}=await this.index(locale);const byId=new Map(items.map(x=>[x.card.id,x.card]));
    return [...new Set(ids)].map(id=>byId.get(id)).filter((x):x is SearchCard=>Boolean(x)).map(x=>({...x}));
  }
  async home(locale:'en'|'bn'){
    const base:SearchQuery={locale,sort:'newest',page:1};const latest=await this.search(base);
    const popular=latest.facets.model.filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,6);
    const {items}=await this.index(locale);
    const budgets=[10,20,30,50].map(maxLakh=>({maxLakh,count:items.filter(x=>x.card.priceLakh<=maxLakh).length}));
    return {popularModels:popular,bodies:latest.facets.body.filter(x=>x.count>0).sort((a,b)=>b.count-a.count).slice(0,6),
      budgets,newListings:latest.cards.slice(0,8),featured:latest.cards.filter(x=>x.placement==='featured').slice(0,4),total:latest.total};
  }
  async trackImpressions(actor:{role:'system'},ids:string[]):Promise<void>{
    if(actor.role!=='system'||ids.length>24||new Set(ids).size!==ids.length)throw new Error('Trusted impression batch required');
    const now=this.clock();await this.listings.transaction(state=>{for(const id of ids){const row=state.listings.find(x=>x.id===id);
      if(row&&isLive(row,now))row.metrics.impressions=(row.metrics.impressions??0)+1}});
  }
  async viewCard(actor:{role:'system'},id:string,locale:'en'|'bn'):Promise<SearchCard>{
    if(actor.role!=='system')throw new Error('Trusted view required');
    const card=(await this.cardsByIds([id],locale))[0];if(!card)throw new Error('Live car not found');
    await this.listings.transaction(state=>{const row=state.listings.find(x=>x.id===id);if(row&&isLive(row,this.clock()))row.metrics.views++});
    return card;
  }
}
