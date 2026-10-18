import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalog, demoDealers, demoListings, demoPromotions, seedDemo } from '../src/demo-data.ts';
import { SearchService, decodeCursor } from '../src/service.ts';
import { parseSearchQuery, resolveRoute } from '../src/query.ts';
import { districts, divisions } from '../src/locations.ts';
import type { Promotion, SearchQuery } from '../src/types.ts';
import { JsonPromotionPort } from '../src/promotions.ts';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const clock=new Date('2026-10-18T08:00:00.000Z');
const service=new SearchService({listings:demoListings,catalog:demoCatalog,dealers:demoDealers,
  promotions:{async active(){return demoPromotions}},clock:()=>clock});
const base=(changes:Partial<SearchQuery>={}):SearchQuery=>({locale:'en',sort:'best_match',page:1,...changes});
before(async()=>{await seedDemo(clock)});

test('district catalogue covers Bangladesh and bilingual district routes',async()=>{
  assert.equal(divisions.length,8);assert.equal(districts.length,64);
  const catalog=await demoCatalog.snapshot();
  assert.deepEqual(resolveRoute('/cars/dhaka',catalog),{kind:'search',locale:'en',district:'dhaka'});
  assert.deepEqual(resolveRoute('/bn/cars/toyota/axio',catalog),{kind:'search',locale:'bn',makeId:'toyota',modelId:'axio'});
  assert.equal(resolveRoute('/cars/unknown',catalog),null);
});

test('parses full validated URL state and rejects invalid ranges/location',async()=>{
  const catalog=await demoCatalog.snapshot(),route=resolveRoute('/cars',catalog)!;
  const q=parseSearchQuery(new URLSearchParams('model=noah&model=axio&priceMin=20&priceMax=45&yearMin=2018&regMax=2025&mileageMax=50000&ccMin=1000&fuel=hybrid&body=suv&transmission=cvt&seller=dealer&division=dhaka&district=dhaka&area=Uttara&auctionVerified=1&papersChecked=0&verifiedDealer=1&minAuctionGrade=4&sort=newest&page=2'),route,catalog,clock);
  assert.deepEqual(q.modelIds,['noah','axio']);assert.equal(q.maxPriceLakh,45);assert.equal(q.district,'dhaka');assert.equal(q.auctionVerified,true);assert.equal(q.papersChecked,false);
  assert.throws(()=>parseSearchQuery(new URLSearchParams('priceMin=50&priceMax=20'),route,catalog,clock));
  assert.throws(()=>parseSearchQuery(new URLSearchParams('division=dhaka&district=sylhet'),route,catalog,clock));
  assert.equal(parseSearchQuery(new URLSearchParams('division=dhaka'),route,catalog,clock).division,'dhaka');
  assert.throws(()=>parseSearchQuery(new URLSearchParams('model=unlisted'),route,catalog,clock));
  assert.equal(parseSearchQuery(new URLSearchParams('grade=not-listed'),route,catalog,clock).gradeId,'not-listed');
});

test('filters vehicle, seller, location, numeric and trust fields',async()=>{
  const noah=await service.search(base({modelIds:['noah']}));assert.equal(noah.total,4);assert.ok(noah.cards.every(x=>x.modelId==='noah'));
  const filtered=await service.search(base({makeId:'toyota',maxPriceLakh:30,maxMileageKm:40000,division:'dhaka',sellerType:'dealer'}));
  assert.ok(filtered.total>0);assert.ok(filtered.cards.every(x=>x.makeId==='toyota'&&x.priceLakh<=30&&x.mileageKm<=40000&&x.division==='dhaka'&&x.sellerType==='dealer'));
  const trust=await service.search(base({auctionVerified:true,minAuctionGrade:4.5}));
  assert.ok(trust.total>0);assert.ok(trust.cards.every(x=>x.auctionVerified&&x.auctionGrade!>=4.5));
  const verifiedDealer=await service.search(base({verifiedDealer:true}));assert.ok(verifiedDealer.cards.every(x=>x.verifiedDealer));
  const paper=await service.search(base({papersChecked:true}));assert.ok(paper.cards.every(x=>x.papersChecked));
});

test('English/Bangla aliases and punctuation-insensitive model search',async()=>{
  for(const keyword of ['Noah','নোয়া']){const result=await service.search(base({keyword}));assert.equal(result.total,4);assert.ok(result.cards.every(x=>x.modelId==='noah'))}
  for(const keyword of ['X-Trail','xtrail']){const result=await service.search(base({keyword}));assert.ok(result.total>0);assert.ok(result.cards.every(x=>x.modelId==='xtrail'))}
  const bangla=await service.search(base({locale:'bn',modelIds:['axio']}));assert.match(bangla.cards[0].title,/টয়োটা/);
});

test('sort order and 24-result web pagination with bound app cursor',async()=>{
  const all=await service.search(base());assert.equal(all.total,48);assert.equal(all.cards.length,24);assert.equal(all.totalPages,2);
  assert.equal(new Set(all.cards.map(x=>x.id)).size,24);
  assert.ok(all.nextCursor);assert.equal(decodeCursor(all.nextCursor!,base()),2);
  assert.throws(()=>decodeCursor(all.nextCursor!,base({keyword:'Noah'})));
  const second=await service.search(base({page:2}));assert.equal(second.cards.length,24);
  assert.equal(new Set([...all.cards,...second.cards].map(x=>x.id)).size,48);
  const low=await service.search(base({sort:'price_asc'}));
  const normal=low.cards.filter(x=>!x.placement);assert.ok(normal.every((x,i)=>i===0||normal[i-1].priceBdt<=x.priceBdt));
  const year=await service.search(base({sort:'year_desc'}));const normalYear=year.cards.filter(x=>!x.placement);
  assert.ok(normalYear.every((x,i)=>i===0||normalYear[i-1].year>=x.year));
});

test('paid placements are labelled, capped, require paid proof and never shrink pages',async()=>{
  const extra:Promotion[]=[];
  for(let i=5;i<=29;i++)extra.push({listingId:`demo-car-${String(i).padStart(3,'0')}`,kind:'featured',status:'paid',paymentReference:`PAY-${i}`,
    startsAt:new Date(clock.getTime()-1000).toISOString(),endsAt:new Date(clock.getTime()+86400_000).toISOString()});
  const promoted=new SearchService({listings:demoListings,catalog:demoCatalog,dealers:demoDealers,promotions:{async active(){return [...demoPromotions,...extra]}},clock:()=>clock});
  const first=await promoted.search(base()),second=await promoted.search(base({page:2}));
  assert.equal(first.cards.length,24);assert.equal(second.cards.length,24);
  assert.ok(first.cards.filter(x=>x.placement).length<=3);assert.ok(second.cards.filter(x=>x.placement).length<=3);
  assert.equal(first.cards.find(x=>x.id==='demo-car-004')?.placement,undefined);
  assert.ok(first.cards.some(x=>x.placement==='top'));
});

test('local promotion feed ignores unpaid and expired claims',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'carbuy-promos-'));
  try{const file=join(folder,'promotions.json');await writeFile(file,JSON.stringify([
    {listingId:'demo-car-001',kind:'top',status:'paid',paymentReference:'PAID-1',startsAt:'2026-10-17T00:00:00Z',endsAt:'2026-10-19T00:00:00Z'},
    {listingId:'demo-car-002',kind:'top',status:'pending',paymentReference:'',startsAt:'2026-10-17T00:00:00Z',endsAt:'2026-10-19T00:00:00Z'},
    {listingId:'demo-car-003',kind:'featured',status:'paid',paymentReference:'PAID-3',startsAt:'2026-10-16T00:00:00Z',endsAt:'2026-10-17T00:00:00Z'},
  ]));assert.deepEqual((await new JsonPromotionPort(file).active(clock)).map(x=>x.listingId),['demo-car-001'])}
  finally{await rm(folder,{recursive:true,force:true})}
});

test('facet counts, empty suggestions, home budgets and safe card projection',async()=>{
  const result=await service.search(base({makeId:'toyota',modelIds:['axio']}));
  assert.equal(result.total,4);assert.equal(result.facets.model.find(x=>x.id==='noah')?.count,4);
  assert.equal(result.facets.make.find(x=>x.id==='honda')?.count,0);
  const empty=await service.search(base({keyword:'unobtainium',maxPriceLakh:5,auctionVerified:true}));assert.equal(empty.total,0);assert.ok(empty.suggestions.length>0);
  const home=await service.home('en');assert.equal(home.total,48);assert.equal(home.budgets.find(x=>x.maxLakh===30)?.count,17);
  const card=result.cards[0];const serialized=JSON.stringify(card);
  for(const privateKey of ['chassis','registrationNumber','privateKey','sellerId','phone'])assert.ok(!serialized.includes(privateKey));
});

test('withdrawn, draft and expired cars disappear; tracking only touches live cars',async()=>{
  await demoListings.transaction(state=>{state.listings.find(x=>x.id==='demo-car-048')!.status='withdrawn';state.listings.find(x=>x.id==='demo-car-047')!.expiresAt=new Date(clock.getTime()-1000).toISOString()});
  const result=await service.search(base());assert.equal(result.total,46);
  await service.trackImpressions({role:'system'},[result.cards[0].id,'demo-car-048']);
  const viewed=await service.viewCard({role:'system'},result.cards[0].id,'en');
  const state=await demoListings.read();assert.equal(state.listings.find(x=>x.id===viewed.id)?.metrics.views,1);
  assert.equal(state.listings.find(x=>x.id==='demo-car-048')?.metrics.impressions,0);
  await assert.rejects(()=>service.viewCard({role:'system'},'demo-car-048','en'));
  await assert.rejects(()=>service.trackImpressions({role:'system'},Array(25).fill('x')));
});
