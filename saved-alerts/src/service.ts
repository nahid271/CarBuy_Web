import { randomUUID } from 'node:crypto';
import type { CatalogService } from '../../vehicle-data/src/catalog.ts';
import type { ListingStore, Listing } from '../../listings/src/types.ts';
import { parseSearchQuery, resolveRoute } from '../../search/src/query.ts';
import type { SearchService } from '../../search/src/service.ts';
import type { SavedStore, SavedAlert } from './types.ts';

export class SavedError extends Error{readonly status:number;constructor(status:number,message:string){super(message);this.status=status}}
const idOk=(id:string)=>/^[a-zA-Z0-9-]{1,80}$/.test(id);
const active=(row:Listing,now:Date)=>row.status==='live'&&Boolean(row.expiresAt)&&Date.parse(row.expiresAt!)>now.getTime();
const dayDhaka=(now:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const hourDhaka=(now:Date)=>Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Dhaka',hour:'2-digit',hourCycle:'h23'}).format(now));
export class SavedService{
  private readonly store:SavedStore;private readonly listings:ListingStore;private readonly catalog:CatalogService;
  private readonly search:SearchService;private readonly clock:()=>Date;private processing=false;
  constructor(args:{store:SavedStore;listings:ListingStore;catalog:CatalogService;search:SearchService;clock?:()=>Date}){
    this.store=args.store;this.listings=args.listings;this.catalog=args.catalog;this.search=args.search;this.clock=args.clock??(()=>new Date())}
  async cars(buyerId:string,locale:'en'|'bn'){
    const [state,inventory,catalog]=await Promise.all([this.store.read(),this.listings.read(),this.catalog.snapshot()]);
    const byId=new Map(inventory.listings.map(x=>[x.id,x]));
    return state.cars.filter(x=>x.buyerId===buyerId).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)).map(saved=>{
      const row=byId.get(saved.listingId);const currentPrice=row?.data.priceBdt;
      const make=catalog.makes.find(x=>x.id===row?.data.makeId)?.name[locale]??row?.data.makeId??'';
      const model=catalog.models.find(x=>x.id===row?.data.modelId)?.name[locale]??row?.data.modelId??'';
      const state= !row?'removed':active(row,this.clock())?'live':row.status==='sold'?'sold':row.status==='expired'||row.status==='live'?'expired':'removed';
      return {id:saved.listingId,title:row?`${make} ${model} ${row.data.manufactureYear??''}`.trim():'Listing no longer available',
        status:state,priceBdt:currentPrice??null,savedPriceBdt:saved.savedPriceBdt,priceDropBdt:currentPrice?Math.max(0,saved.savedPriceBdt-currentPrice):0,
        coverKey:row?.photos[0]?.webpKey??null,district:row?.data.district??'',area:row?.data.area??'',savedAt:saved.savedAt};
    });
  }
  async saveCar(buyerId:string,id:string){
    if(!idOk(id))throw new SavedError(400,'Invalid car ID');
    const row=(await this.listings.read()).listings.find(x=>x.id===id);
    if(!row||!active(row,this.clock())||!row.data.priceBdt)throw new SavedError(404,'Available car not found');
    return this.store.transaction(state=>{
      const existing=state.cars.find(x=>x.buyerId===buyerId&&x.listingId===id);if(existing)return existing;
      if(state.cars.filter(x=>x.buyerId===buyerId).length>=200)throw new SavedError(409,'Saved car limit reached');
      const saved={buyerId,listingId:id,savedAt:this.clock().toISOString(),savedPriceBdt:row.data.priceBdt!};state.cars.push(saved);return saved;
    });
  }
  async removeCar(buyerId:string,id:string){if(!idOk(id))throw new SavedError(400,'Invalid car ID');
    return this.store.transaction(state=>{const before=state.cars.length;state.cars=state.cars.filter(x=>x.buyerId!==buyerId||x.listingId!==id);return {removed:state.cars.length<before}})}
  async recent(buyerId:string,locale:'en'|'bn'){
    const rows=(await this.store.read()).recent.filter(x=>x.buyerId===buyerId).sort((a,b)=>b.viewedAt.localeCompare(a.viewedAt)).slice(0,20);
    const cards=await this.search.cardsByIds(rows.map(x=>x.listingId),locale);const byId=new Map(cards.map(x=>[x.id,x]));
    return rows.map(x=>byId.get(x.listingId)).filter((x):x is NonNullable<typeof x>=>Boolean(x));
  }
  async view(buyerId:string,id:string){if(!idOk(id))throw new SavedError(400,'Invalid car ID');
    const row=(await this.listings.read()).listings.find(x=>x.id===id);if(!row)throw new SavedError(404,'Car not found');
    return this.store.transaction(state=>{state.recent=state.recent.filter(x=>x.buyerId!==buyerId||x.listingId!==id);
      const latest=state.recent.filter(x=>x.buyerId===buyerId).reduce((max,x)=>Math.max(max,Date.parse(x.viewedAt)),0);
      state.recent.push({buyerId,listingId:id,viewedAt:new Date(Math.max(this.clock().getTime(),latest+1)).toISOString()});
      const mine=state.recent.filter(x=>x.buyerId===buyerId).sort((a,b)=>b.viewedAt.localeCompare(a.viewedAt));
      const keep=new Set(mine.slice(0,20).map(x=>x.listingId));state.recent=state.recent.filter(x=>x.buyerId!==buyerId||keep.has(x.listingId));return {ok:true}})}
  async syncRecent(buyerId:string,ids:string[]){if(ids.length>20||ids.some(x=>!idOk(x)))throw new SavedError(400,'Invalid recent cars');
    const existing=new Set((await this.listings.read()).listings.map(x=>x.id));
    for(const id of [...new Set(ids)].reverse())if(existing.has(id))await this.view(buyerId,id);
    return this.recent(buyerId,'en');
  }
  async alerts(buyerId:string){return (await this.store.read()).alerts.filter(x=>x.buyerId===buyerId&&x.active).map(({seenIds,pendingIds,...rest})=>rest)}
  async createAlert(buyerId:string,input:{path:string;frequency:string;channels:string[]}){
    if(typeof input.path!=='string'||input.path.length>600||!input.path.startsWith('/'))throw new SavedError(400,'Invalid search path');
    let url:URL;try{url=new URL(input.path,'http://carbuy.invalid')}catch{throw new SavedError(400,'Invalid search path')}
    if(url.origin!=='http://carbuy.invalid'||url.hash)throw new SavedError(400,'Invalid search path');
    const route=resolveRoute(url.pathname,await this.catalog.snapshot());if(!route||route.kind!=='search')throw new SavedError(400,'Choose a search page');
    if(input.frequency!=='instant'&&input.frequency!=='daily')throw new SavedError(400,'Choose alert frequency');
    if(!Array.isArray(input.channels)||input.channels.length<1||input.channels.length>2||new Set(input.channels).size!==input.channels.length||
      input.channels.some(x=>x!=='push'&&x!=='email'))throw new SavedError(400,'Choose push and/or email');
    let query;try{query=parseSearchQuery(url.searchParams,route,await this.catalog.snapshot(),this.clock())}catch(error){throw new SavedError(400,(error as Error).message)}
    query.page=1;query.sort='newest';const initial=await this.matching(query);const normalized=`${url.pathname}${url.search}`;
    return this.store.transaction(state=>{
      const current=state.alerts.filter(x=>x.buyerId===buyerId&&x.active);
      if(current.length>=20)throw new SavedError(409,'Saved search limit reached');
      if(current.some(x=>x.path===normalized))throw new SavedError(409,'This search already has an alert');
      const alert:SavedAlert={id:randomUUID(),buyerId,path:normalized,query,frequency:input.frequency as 'instant'|'daily',
        channels:input.channels as ('push'|'email')[],createdAt:this.clock().toISOString(),active:true,seenIds:initial,pendingIds:[]};
      state.alerts.push(alert);return {id:alert.id,path:alert.path,frequency:alert.frequency,channels:alert.channels,createdAt:alert.createdAt,active:true};
    });
  }
  async unsubscribe(buyerId:string,id:string){return this.store.transaction(state=>{const row=state.alerts.find(x=>x.id===id&&x.buyerId===buyerId&&x.active);
    if(!row)throw new SavedError(404,'Active alert not found');row.active=false;row.pendingIds=[];return {ok:true}})}
  async deliveries(buyerId:string){return (await this.store.read()).deliveries.filter(x=>x.buyerId===buyerId).sort((a,b)=>b.queuedAt.localeCompare(a.queuedAt)).slice(0,30)}
  private async matching(query:SavedAlert['query']){const result:string[]=[];for(let page=1;page<=10000;page++){
    const batch=await this.search.search({...query,page});result.push(...batch.cards.map(x=>x.id));if(page>=batch.totalPages)break}
    return result}
  async processAlerts(){if(this.processing)return 0;this.processing=true;let count=0;
    try{const now=this.clock(),alerts=(await this.store.read()).alerts.filter(x=>x.active);
      for(const alert of alerts){const matching=await this.matching(alert.query);
        const newIds=matching.filter(id=>!alert.seenIds.includes(id));
        await this.store.transaction(state=>{const row=state.alerts.find(x=>x.id===alert.id&&x.active);if(!row)return;
          for(const id of newIds)if(!row.seenIds.includes(id)){row.seenIds.push(id);row.pendingIds.push(id)}
          row.pendingIds=[...new Set(row.pendingIds)];
          const due=row.frequency==='instant'||(hourDhaka(now)>=9&&row.lastDigestDay!==dayDhaka(now));
          if(!due||!row.pendingIds.length)return;
          const ids=row.pendingIds.splice(0);if(row.frequency==='daily')row.lastDigestDay=dayDhaka(now);
          for(const channel of row.channels){state.deliveries.push({id:randomUUID(),alertId:row.id,buyerId:row.buyerId,channel,
            listingIds:ids,queuedAt:now.toISOString(),status:'queued'});count++}
        });
      }return count;
    }finally{this.processing=false}}
}
