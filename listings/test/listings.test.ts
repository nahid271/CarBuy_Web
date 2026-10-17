import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { CatalogService } from '../../vehicle-data/src/catalog.ts';
import { MemoryCatalogStore } from '../../vehicle-data/src/store.ts';
import { ListingService } from '../src/service.ts';
import { MemoryListingStore } from '../src/store.ts';
import { formatBdt, parseBdt } from '../src/price.ts';
import { LocalMediaStore, preparePaper, preparePhoto } from '../src/media.ts';
import type { Actor, BillingPort, Listing, ListingData, ListingPhoto } from '../src/types.ts';

const seller:Actor={id:'seller-1',role:'seller',phoneVerified:true,sellerType:'private'};
const moderator:Actor={id:'mod-1',role:'moderator'};
const system:Actor={id:'cron',role:'system'};
const billing:BillingPort={
  async createCheckout(order){return {url:`https://example.test/pay/${order.id}`,reference:`test-${order.id}`}},
  async verifyPayment(order,proof){return proof===`test:${order.id}`},
  async refund(){return true},
};
const data=(serial:number):ListingData=>({makeId:'toyota',modelId:'aqua',generationId:'aqua-nhp10',gradeId:'aqua-nhp10-x-urban',manufactureYear:2018,
  mileageKm:50000,engineCc:1496,fuel:'hybrid',transmission:'cvt',body:'hatchback',chassisNumber:`NHP10-${String(serial).padStart(7,'0')}`,
  condition:'reconditioned',priceBdt:2800000,negotiable:true,district:'Dhaka',area:'Dhanmondi'});
const fakePhoto=(i:number):ListingPhoto=>({id:`photo-${i}`,position:i,webpKey:`${i}.webp`,avifKey:`${i}.avif`,sha256:`hash-${i}`,width:1200,height:900,hints:[]});
async function prepared(service:ListingService,actor:Actor,serial:number):Promise<Listing>{
  let listing=await service.createDraft(actor);
  listing=await service.saveDraft(actor,listing.id,{...data(serial),...(actor.sellerType==='dealer'?{stockNumber:`STK-${serial}`,stockStatus:'ready' as const}:{})},listing.version);
  for(let i=0;i<4;i++)listing=await service.addPhoto(actor,listing.id,fakePhoto(serial*10+i));
  return listing;
}
async function published(service:ListingService,actor:Actor,serial:number):Promise<Listing>{
  let listing=await prepared(service,actor,serial);
  const checkout=await service.beginSubmission(actor,listing.id);
  const order=checkout.listing.feeOrders.at(-1)!;
  listing=await service.confirmPayment(listing.id,order.id,`test:${order.id}`);
  return service.approve(moderator,listing.id);
}

test('LST-02/03/04: validates Bangladesh listing fields and parses lakh prices',async()=>{
  assert.equal(parseBdt('28.5 lakh'),2850000);
  assert.equal(parseBdt('২৮.৫ লাখ'),2850000);
  assert.equal(parseBdt('৳28,50,000'),2850000);
  assert.equal(formatBdt(2850000),'৳28,50,000');
  assert.equal(formatBdt(2850000,'bn'),'৳২৮,৫০,০০০');
  const service=new ListingService(new MemoryListingStore(),new CatalogService(new MemoryCatalogStore()),billing);
  let listing=await service.createDraft(seller);
  const bad={...data(1),condition:'used' as const,registrationYear:undefined};
  listing=await service.saveDraft(seller,listing.id,bad);
  for(let i=0;i<4;i++)await service.addPhoto(seller,listing.id,fakePhoto(i));
  await assert.rejects(service.beginSubmission(seller,listing.id),/registration year/);
  await service.saveDraft(seller,listing.id,{registrationYear:2020});
  assert.equal((await service.beginSubmission(seller,listing.id)).listing.status,'pending_payment');
});

test('LST-05/06/17: photos become metadata-free WebP/AVIF; papers remain moderator-only',async()=>{
  const source=await sharp({create:{width:900,height:700,channels:3,background:'#e9d7c0'}}).jpeg().toBuffer();
  const result=await preparePhoto(source);
  assert.equal((await sharp(result.webp).metadata()).format,'webp');
  assert.equal((await sharp(result.avif).metadata()).format,'heif');
  assert.equal((await sharp(result.webp).metadata()).exif,undefined);
  const temp=await mkdtemp(join(tmpdir(),'carbuy-media-'));
  try{
    const media=new LocalMediaStore(temp);
    const paper=await preparePaper(Buffer.from('%PDF-1.4\nexample document'),'registration');
    const key=await media.savePrivate(paper.paper.id,paper.extension,paper.bytes);
    await assert.rejects(media.readPrivate(seller,key),/Moderator required/);
    assert.equal((await media.readPrivate(moderator,key)).toString().startsWith('%PDF-'),true);
  }finally{await rm(temp,{recursive:true,force:true})}
});

test('LST-01/09/10/11/13/14: payment, review, price audit, material edit, expiry and sold outcome',async()=>{
  let now=new Date('2026-10-17T00:00:00Z');
  const service=new ListingService(new MemoryListingStore(),new CatalogService(new MemoryCatalogStore()),billing,()=>now);
  let listing=await published(service,seller,100);
  assert.equal(listing.status,'live');assert.equal(listing.expiresAt,'2026-12-16T00:00:00.000Z');
  listing=await service.editLive(seller,listing.id,{priceBdt:2750000});
  assert.equal(listing.status,'live');assert.equal(listing.priceHistory.at(-1)?.priceBdt,2750000);
  listing=await service.editLive(seller,listing.id,{mileageKm:51000});
  assert.equal(listing.status,'pending_review');
  listing=await service.approve(moderator,listing.id);
  assert.equal(listing.expiresAt,'2026-12-16T00:00:00.000Z');
  const links=service.shareLinks(listing.id,'https://carbuy.example');
  assert.ok(links.whatsapp.includes('wa.me'));assert.ok(links.facebook.includes('facebook.com'));assert.ok(links.messenger.includes('messenger'));
  await service.recordEngagement(system,listing.id,'views');
  await service.recordEngagement(system,listing.id,'call');
  assert.equal((await service.myListings(seller))[0].contacts.call,1);
  now=new Date('2026-12-09T00:00:00Z');
  assert.deepEqual((await service.expireAndRemind(system)).map(x=>x.daysRemaining),[7]);
  assert.equal((await service.expireAndRemind(system)).length,0);
  now=new Date('2026-12-16T00:00:01Z');await service.expireAndRemind(system);
  listing=await service.getOwn(seller,listing.id);assert.equal(listing.status,'expired');
  const renewal=await service.beginRenewal(seller,listing.id);
  const order=renewal.listing.feeOrders.at(-1)!;
  listing=await service.confirmRenewal(listing.id,order.id,`test:${order.id}`);
  assert.equal(listing.status,'live');assert.equal(listing.feeOrders.length,2);
  listing=await service.markSold(seller,listing.id,'elsewhere');
  assert.equal(listing.soldVia,'elsewhere');
  const next=await service.relistSold(seller,listing.id);
  assert.equal(next.status,'draft');assert.equal(next.vehicleId,listing.vehicleId);
  assert.ok((await service.vehicleHistory(seller,next.id)).length>=2);
});

test('LST-09/10/15: corrected material edit reuses paid term; guidance appears after five comparables',async()=>{
  const service=new ListingService(new MemoryListingStore(),new CatalogService(new MemoryCatalogStore()),billing);
  let listing=await published(service,seller,400);
  const expiry=listing.expiresAt;
  listing=await service.editLive(seller,listing.id,{mileageKm:60000});
  listing=await service.reject(moderator,listing.id,'Check mileage');
  assert.equal(listing.feeOrders.at(-1)?.status,'paid');
  listing=await service.saveDraft(seller,listing.id,{mileageKm:55000});
  const resubmit=await service.beginSubmission(seller,listing.id);
  assert.equal(resubmit.listing.status,'pending_review');
  assert.equal(resubmit.listing.feeOrders.length,1);
  assert.equal((await service.approve(moderator,listing.id)).expiresAt,expiry);
  const dealer:Actor={id:'dealer-1',role:'seller',phoneVerified:true,sellerType:'dealer',dealerOrgId:'dealer-org-1'};
  for(let i=0;i<4;i++)await published(service,dealer,410+i);
  const guidance=await service.priceGuidance('toyota','aqua',2018);
  assert.equal(guidance?.sampleSize,5);
  assert.equal(guidance?.medianBdt,2800000);
});

test('LST-04/09/12/15: private active cap, duplicate chassis, comparable threshold, rejection refund',async()=>{
  const store=new MemoryListingStore();const service=new ListingService(store,new CatalogService(new MemoryCatalogStore()),billing);
  const first=await published(service,seller,200);
  const duplicate=await prepared(service,seller,200);
  await assert.rejects(service.beginSubmission(seller,duplicate.id),/live listing already uses/);
  await published(service,seller,201);await published(service,seller,202);
  const fourth=await prepared(service,seller,203);
  await assert.rejects(service.beginSubmission(seller,fourth.id),/at most 3 active cars/);
  assert.equal(await service.priceGuidance('toyota','aqua',2018),null);
  await service.markSold(seller,first.id,'carbuy');
  const newOne=await prepared(service,seller,204);
  const order=(await service.beginSubmission(seller,newOne.id)).listing.feeOrders.at(-1)!;
  const pending=await service.confirmPayment(newOne.id,order.id,`test:${order.id}`);
  const rejected=await service.reject(moderator,pending.id,'Photo issue');
  assert.equal(rejected.status,'rejected');assert.equal(rejected.feeOrders.at(-1)?.status,'refunded');
});
