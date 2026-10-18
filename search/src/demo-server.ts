import { createServer, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore, JsonFileCatalogStore } from '../../vehicle-data/src/store.ts';
import { JsonListingStore } from '../../listings/src/store.ts';
import { LocalMediaStore } from '../../listings/src/media.ts';
import { JsonDealerStore } from '../../dealers/src/store.ts';
import { bodyValues, fuelValues, transmissionValues } from '../../vehicle-data/src/values.ts';
import { demoCatalog, demoDealers, demoListings, demoPromotions, seedDemo } from './demo-data.ts';
import { districts, divisions } from './locations.ts';
import { parseSearchQuery, resolveRoute } from './query.ts';
import { decodeCursor, SearchService } from './service.ts';
import { JsonPromotionPort } from './promotions.ts';
import type { SearchCard, SearchQuery, SearchResult } from './types.ts';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT??4175);
const real=Boolean(process.env.CARBUY_LISTINGS_FILE);
if(!real)await seedDemo();
const catalog=real?new CatalogService(process.env.CARBUY_CATALOG_FILE?new JsonFileCatalogStore(process.env.CARBUY_CATALOG_FILE):new MemoryCatalogStore()):demoCatalog;
const listings=real?new JsonListingStore(process.env.CARBUY_LISTINGS_FILE!):demoListings;
const dealers=process.env.CARBUY_DEALERS_FILE?new JsonDealerStore(process.env.CARBUY_DEALERS_FILE):real?undefined:demoDealers;
const media=real?new LocalMediaStore(process.env.CARBUY_MEDIA_DIR??join(root,'..','listings','.local','media')):null;
const promotions=process.env.CARBUY_PROMOTIONS_FILE?new JsonPromotionPort(process.env.CARBUY_PROMOTIONS_FILE):{async active(){return real?[]:demoPromotions}};
const service=new SearchService({listings,catalog,dealers,promotions});
const escape=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const json=(res:ServerResponse,status:number,value:unknown)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value))};
const localeText=(locale:'en'|'bn',en:string,bn:string)=>locale==='bn'?bn:en;
function cardHtml(card:SearchCard,locale:'en'|'bn'){
  const badges=[card.auctionVerified?localeText(locale,'Auction sheet verified','অকশন শিট যাচাইকৃত'):null,
    card.papersChecked?localeText(locale,'Papers checked','কাগজপত্র যাচাই'):null,
    card.verifiedDealer?localeText(locale,'Verified dealer','যাচাইকৃত ডিলার'):null].filter(Boolean);
  const placement=card.placement?`<span class="paid-label">${escape(card.placement==='top'?'Top · Paid':'Featured · Paid')}</span>`:'';
  return `<article class="car-card"><a href="/preview/${encodeURIComponent(card.id)}" class="card-photo" aria-label="${escape(card.title)}">${card.coverKey?`<img src="/media/public/${encodeURIComponent(card.coverKey)}" alt="${escape(card.title)}" loading="lazy">`:''}${placement}</a><div class="card-info"><div class="card-topline"><span>${escape(card.condition)} · ${escape(card.year)}</span><span>${escape(card.area)}, ${escape(card.district)}</span></div><h3><a href="/preview/${encodeURIComponent(card.id)}">${escape(card.title)}</a></h3><div class="price">৳ ${escape(card.priceLakh.toLocaleString('en-BD'))} <small>${localeText(locale,'lakh','লাখ')}</small></div><div class="specs"><span>${escape(card.mileageKm.toLocaleString('en-BD'))} km</span><span>${escape(card.engineCc)} cc</span><span>${escape(card.fuel)}</span></div><div class="card-footer"><div class="badges">${badges.map(x=>`<span class="trust-badge">${escape(x)}</span>`).join('')}</div><button type="button" class="save-btn" data-save="${escape(card.id)}" aria-label="Save car">♡</button></div></div></article>`;
}
async function page(res:ServerResponse,path:string,search:string){
  const snapshot=await catalog.snapshot();const route=resolveRoute(path,snapshot);
  if(!route){res.writeHead(404);res.end('Not found');return}
  const q=parseSearchQuery(new URLSearchParams(search),route,snapshot);
  const data=route.kind==='home'?await service.home(route.locale):await service.search(q);
  const title=route.kind==='home'?localeText(route.locale,'Buy and sell cars in Bangladesh | CarBuy','বাংলাদেশে গাড়ি কেনাবেচা | CarBuy'):
    `${route.modelId?`${snapshot.models.find(x=>x.id===route.modelId)?.name[route.locale]} `:''}${localeText(route.locale,'Cars for sale','বিক্রির জন্য গাড়ি')}${route.district?` · ${route.district}`:''} | CarBuy`;
  const description=localeText(route.locale,'Search cars by model, budget, location and verified trust signals across Bangladesh.','বাংলাদেশজুড়ে মডেল, বাজেট, এলাকা ও যাচাইকৃত তথ্য দিয়ে গাড়ি খুঁজুন।');
  const base=(process.env.PUBLIC_BASE_URL??`http://127.0.0.1:${port}`).replace(/\/$/,'');
  const canonical=`${base}${path}${search}`;
  const englishPath=route.locale==='bn'?path.replace(/^\/bn/,'')||'/':path;
  const bengaliPath=route.locale==='bn'?path:path==='/'?'/bn':`/bn${path}`;
  const results=route.kind==='home'?(data as Awaited<ReturnType<typeof service.home>>).newListings:(data as SearchResult).cards;
  let html=await readFile(join(root,'web','index.html'),'utf8');
  html=html.replaceAll('__LANG__',route.locale).replace('__TITLE__',escape(title)).replace('__DESCRIPTION__',escape(description))
    .replace('__CANONICAL__',escape(canonical)).replace('__ENGLISH__',escape(`${base}${englishPath}${search}`)).replace('__BENGALI__',escape(`${base}${bengaliPath}${search}`))
    .replace('__SSR_CARDS__',results.map(x=>cardHtml(x,route.locale)).join(''))
    .replace('__BOOTSTRAP__',JSON.stringify({route,data,query:q,real}).replace(/</g,'\\u003c'));
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',
    'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'; frame-ancestors 'none'"});res.end(html);
}
function demoSvg(key:string){
  const colour=Number(key.match(/-(\d)\.svg$/)?.[1]??0);
  const paint=['#cdd8d9','#eef0e9','#1e343a','#9cbbc1','#a95e55','#9ca9a7'][colour%6];
  const text=escape(key.slice(5).replace(/-\d\.svg$/,'').replace(/-/g,' ').toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#eef0ec"/><stop offset="1" stop-color="#d3dcd8"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><path d="M0 630h1200v170H0z" fill="#b4c5c0"/><path d="M160 516l90-128q40-56 138-65l358-15q87-2 130 52l91 108 74 36q23 12 23 42v72H126v-62q0-26 34-40z" fill="${paint}" stroke="#496069" stroke-width="14"/><path d="M280 388q28-40 107-46l361-14q67-2 103 43l67 86H213z" fill="#627f89"/><path d="M510 340l-4 116M185 489h840" stroke="#eaf0ed" stroke-width="13"/><circle cx="324" cy="620" r="83" fill="#283b41"/><circle cx="324" cy="620" r="43" fill="#cbd2cf"/><circle cx="865" cy="620" r="83" fill="#283b41"/><circle cx="865" cy="620" r="43" fill="#cbd2cf"/><text x="65" y="105" font-size="34" fill="#426067" font-family="Arial,sans-serif" letter-spacing="6">CARBUY / DEMO</text><text x="65" y="166" font-size="52" font-weight="bold" fill="#243d43" font-family="Arial,sans-serif">${text}</text></svg>`;
}
createServer(async(req,res)=>{
  try{
    const url=new URL(req.url??'/',`http://127.0.0.1:${port}`),path=url.pathname;
    if(req.method!=='GET'){json(res,405,{error:'Method not allowed'});return}
    if(path==='/sell'){
      const body='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sell a car | CarBuy</title><link rel="stylesheet" href="/styles.css"><body><header class="site-header"><a class="brand" href="/">carbuy<span>.</span></a><a class="top-link" href="/">← Back to search</a></header><main class="seller-handoff"><p class="eyebrow">SELL ON CARBUY</p><h1>Create your listing</h1><p>The private seller listing flow is provided by the 9.3 Listings module. Start its local demo with <code>cd listings && npm run demo</code>, then open the seller studio.</p><a class="primary-button" href="http://127.0.0.1:4173/">Open seller studio ↗</a></main></body></html>';
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'self'; style-src 'self'; base-uri 'self'"});res.end(body);return}
    if(path==='/api/bootstrap'){const c=await catalog.snapshot();json(res,200,{catalog:{makes:c.makes.filter(x=>x.active),models:c.models.filter(x=>x.active)},
      divisions,districts,values:{body:bodyValues,fuel:fuelValues,transmission:transmissionValues},real});return}
    if(path==='/api/home'){json(res,200,await service.home(url.searchParams.get('locale')==='bn'?'bn':'en'));return}
    if(path==='/api/recent'){const ids=(url.searchParams.get('ids')??'').split(',').filter(Boolean);json(res,200,await service.cardsByIds(ids,url.searchParams.get('locale')==='bn'?'bn':'en'));return}
    if(path==='/api/search'||path==='/api/app-search'){
      const snapshot=await catalog.snapshot(),route=resolveRoute(url.searchParams.get('route')??'/cars',snapshot);
      if(!route||route.kind!=='search')throw new Error('Invalid search route');
      const q=parseSearchQuery(url.searchParams,route,snapshot);
      if(path==='/api/app-search'&&url.searchParams.has('cursor'))q.page=decodeCursor(url.searchParams.get('cursor')!,q);
      const result=await service.search(q);
      if(!real)await service.trackImpressions({role:'system'},result.cards.map(x=>x.id));
      json(res,200,result);return;
    }
    const preview=/^\/preview\/([a-zA-Z0-9-]{1,80})$/.exec(path);
    if(preview){const locale=url.searchParams.get('lang')==='bn'?'bn':'en';const card=real?(await service.cardsByIds([preview[1]],locale))[0]:await service.viewCard({role:'system'},preview[1],locale);
      if(!card){res.writeHead(404);res.end('Live car not found');return}
      const body=`<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(card.title)} | CarBuy</title><link rel="stylesheet" href="/styles.css"><body><header class="site-header"><a class="brand" href="/">carbuy<span>.</span></a><a href="/cars" class="top-link">← Back to search</a></header><main class="preview"><div class="preview-visual">${card.coverKey?`<img src="/media/public/${encodeURIComponent(card.coverKey)}" alt="${escape(card.title)}">`:''}</div><div><p class="eyebrow">CARBUY · PUBLIC PREVIEW</p><h1>${escape(card.title)}</h1><p class="preview-price">৳ ${escape(card.priceLakh)} lakh</p><p>${escape(card.area)}, ${escape(card.district)} · ${escape(card.condition)}</p><div class="preview-specs"><span>${escape(card.mileageKm.toLocaleString('en-BD'))} km</span><span>${escape(card.engineCc)} cc</span><span>${escape(card.fuel)}</span><span>${escape(card.transmission)}</span></div><p class="muted">Full vehicle detail and contacting sellers are part of the next MVP section.</p><a class="primary-button" href="/cars">Explore more cars</a></div></main><script src="/preview.js" defer></script></body></html>`;
      res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; base-uri 'self'"});res.end(body);return;}
    if(path.startsWith('/media/public/')){const key=path.slice('/media/public/'.length);
      if(/^demo-[a-z0-9-]+-[0-5]\.svg$/.test(key)&&!real){res.writeHead(200,{'content-type':'image/svg+xml','cache-control':'public,max-age=3600','x-content-type-options':'nosniff'});res.end(demoSvg(key));return}
      if(media){const bytes=await media.readPublic(key),type=key.endsWith('.avif')?'image/avif':'image/webp';res.writeHead(200,{'content-type':type,'x-content-type-options':'nosniff'});res.end(bytes);return}
      res.writeHead(404);res.end();return;
    }
    if(['/styles.css','/app.js','/preview.js'].includes(path)){const bytes=await readFile(join(root,'web',path.slice(1)));
      res.writeHead(200,{'content-type':path.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8','x-content-type-options':'nosniff'});res.end(bytes);return}
    await page(res,path,url.search);
  }catch(error){const message=String((error as Error).message??error),bad=/Invalid|Unknown|Choose|too long|must not exceed|outside selected division/.test(message);
    json(res,bad?400:500,{error:bad?message:'Search is unavailable. Please try again.'});if(!bad)console.error(error)}
}).listen(port,'127.0.0.1',()=>console.log(`CarBuy 9.5 search: http://127.0.0.1:${port}/`));
