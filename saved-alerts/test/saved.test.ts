import test from 'node:test';
import assert from 'node:assert/strict';
import { demoCatalog, demoDealers, demoListings, seedDemo } from '../../search/src/demo-data.ts';
import { SearchService } from '../../search/src/service.ts';
import { MemoryListingStore } from '../../listings/src/store.ts';
import { MemorySavedStore } from '../src/store.ts';
import { SavedError, SavedService } from '../src/service.ts';

const initial=new Date('2026-10-18T08:00:00.000Z');
async function fixture(){await seedDemo(initial);const listings=new MemoryListingStore();
  const inventory=await demoListings.read();await listings.transaction(state=>{state.listings=inventory.listings});
  let time=new Date(initial);const clock=()=>time;
  const search=new SearchService({listings,catalog:demoCatalog,dealers:demoDealers,clock});
  const store=new MemorySavedStore(),service=new SavedService({store,listings,catalog:demoCatalog,search,clock});
  return {service,store,listings,setTime:(value:string)=>{time=new Date(value)}}}

test('saved cars are buyer-owned; price drops and sold/expired states reflect live inventory',async()=>{
  const {service,listings}=await fixture();
  await service.saveCar('buyer-a','demo-car-001');assert.equal((await service.cars('buyer-b','en')).length,0);
  await listings.transaction(state=>{const row=state.listings.find(x=>x.id==='demo-car-001')!;row.data.priceBdt!-=200000});
  assert.equal((await service.cars('buyer-a','en'))[0].priceDropBdt,200000);
  await listings.transaction(state=>{state.listings.find(x=>x.id==='demo-car-001')!.status='sold'});
  assert.equal((await service.cars('buyer-a','en'))[0].status,'sold');
  await listings.transaction(state=>{state.listings.find(x=>x.id==='demo-car-001')!.status='expired'});
  assert.equal((await service.cars('buyer-a','en'))[0].status,'expired');
  assert.deepEqual(await service.removeCar('buyer-b','demo-car-001'),{removed:false});
  assert.equal((await service.cars('buyer-a','en')).length,1);
});

test('recent views import guest history, dedupe, and stay scoped to the signed-in buyer',async()=>{
  const {service}=await fixture();await service.syncRecent('buyer-a',['demo-car-001','demo-car-002']);
  await service.view('buyer-a','demo-car-001');
  assert.deepEqual((await service.recent('buyer-a','en')).map(x=>x.id),['demo-car-001','demo-car-002']);
  assert.deepEqual(await service.recent('buyer-b','en'),[]);
  await assert.rejects(()=>service.syncRecent('buyer-a',['../secret']),SavedError);
});

test('validated alert creation, owner-only unsubscribe and initial inventory baseline',async()=>{
  const {service,store}=await fixture();
  await assert.rejects(()=>service.createAlert('buyer-a',{path:'https://bad.example/cars',frequency:'instant',channels:['push']}),SavedError);
  await assert.rejects(()=>service.createAlert('buyer-a',{path:'/cars?priceMin=30&priceMax=20',frequency:'instant',channels:['push']}),SavedError);
  const alert=await service.createAlert('buyer-a',{path:'/cars?model=axio&priceMax=40',frequency:'instant',channels:['push','email']});
  assert.equal((await service.alerts('buyer-b')).length,0);
  assert.ok((await store.read()).alerts[0].seenIds.length>0);
  assert.equal(await service.processAlerts(),0);
  await assert.rejects(()=>service.unsubscribe('buyer-b',alert.id),SavedError);
  assert.deepEqual(await service.unsubscribe('buyer-a',alert.id),{ok:true});
  assert.equal((await service.alerts('buyer-a')).length,0);
});

test('instant alert queues one event per selected channel for a new matching listing, once',async()=>{
  const {service,listings,store,setTime}=await fixture();
  await service.createAlert('buyer-a',{path:'/cars?model=axio',frequency:'instant',channels:['push','email']});
  setTime('2026-10-18T08:01:00.000Z');
  await listings.transaction(state=>{const source=state.listings.find(x=>x.id==='demo-car-001')!;
    state.listings.push({...structuredClone(source),id:'new-axio',publishedAt:'2026-10-18T08:00:30.000Z',
      expiresAt:'2026-11-18T08:00:00.000Z'})});
  assert.equal(await service.processAlerts(),2);assert.equal(await service.processAlerts(),0);
  assert.deepEqual((await store.read()).deliveries.map(x=>x.channel).sort(),['email','push']);
  assert.deepEqual((await service.deliveries('buyer-a'))[0].listingIds,['new-axio']);
  assert.deepEqual(await service.deliveries('buyer-b'),[]);
});

test('daily alerts wait until 9 am Asia/Dhaka and queue a single digest',async()=>{
  const {service,listings,setTime,store}=await fixture();
  await service.createAlert('buyer-a',{path:'/cars?model=axio',frequency:'daily',channels:['push']});
  await listings.transaction(state=>{const source=state.listings.find(x=>x.id==='demo-car-001')!;
    state.listings.push({...structuredClone(source),id:'new-daily-axio',publishedAt:'2026-10-18T08:00:30.000Z',
      expiresAt:'2026-11-18T08:00:00.000Z'})});
  setTime('2026-10-18T02:01:00.000Z');assert.equal(await service.processAlerts(),0);
  setTime('2026-10-18T03:01:00.000Z');assert.equal(await service.processAlerts(),1);
  assert.equal(await service.processAlerts(),0);
  assert.deepEqual((await store.read()).deliveries[0].listingIds,['new-daily-axio']);
});
